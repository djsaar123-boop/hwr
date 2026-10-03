"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Area } from "@/lib/types";
import { SPRING } from "@/lib/ui";
import AreaPicker from "./AreaPicker";
import AreaScreen from "./AreaScreen";
import Calculating from "./Calculating";

type Scene = { kind: "picker" } | { kind: "area"; areaId: string } | { kind: "calculating" };
type Answers = Record<string, string>;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function AssessmentFlow({ areas }: { areas: Area[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [answers, setAnswers] = useState<Answers>({});
  const [scene, setScene] = useState<Scene>({ kind: "picker" });
  const [resumed, setResumed] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const answersRef = useRef<Answers>({});
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  const session = useRef<Promise<string | null> | null>(null);
  const assessmentId = useRef<string | null>(null);
  const creating = useRef<Promise<string> | null>(null);
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const autoLaunched = useRef(new Set<string>());

  const activeIds = useMemo(() => new Set(areas.flatMap((a) => a.questions.map((q) => q.id))), [areas]);
  const total = activeIds.size;
  const answered = Object.keys(answers).filter((id) => activeIds.has(id)).length;
  const isDone = (a: Area, ans: Answers) => a.questions.every((q) => ans[q.id]);
  const doneIds = new Set(areas.filter((a) => isDone(a, answers)).map((a) => a.id));

  // Start (or reuse) a session, then resume any unfinished assessment. Guarded for StrictMode double effects.
  useEffect(() => {
    if (session.current) return;
    session.current = (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let uid = user?.id ?? null;
      if (!uid) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          setProblem("We couldn't start your session. Is “Allow anonymous sign-ins” enabled in Supabase?");
          return null;
        }
        uid = data.user?.id ?? null;
      }
      if (!uid) return null;

      const { data: open } = await supabase
        .from("assessments")
        .select("id, assessment_answers(question_id, option_id)")
        .eq("user_id", uid)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; assessment_answers: { question_id: string; option_id: string }[] }>();

      if (open) {
        assessmentId.current = open.id;
        const restored = Object.fromEntries(open.assessment_answers.map((a) => [a.question_id, a.option_id]));
        if (Object.keys(restored).length) {
          setAnswers((cur) => ({ ...restored, ...cur }));
          setResumed(true);
        }
      }
      return uid;
    })();
  }, [supabase]);

  const ensureAssessment = useCallback(async () => {
    if (assessmentId.current) return assessmentId.current;
    creating.current ??= (async () => {
      const uid = await session.current;
      if (!uid) throw new Error("No session");
      const { data, error } = await supabase.from("assessments").insert({ user_id: uid }).select("id").single();
      if (error) throw error;
      assessmentId.current = data.id as string;
      return assessmentId.current;
    })();
    try {
      return await creating.current;
    } catch (e) {
      creating.current = null;
      throw e;
    }
  }, [supabase]);

  const save = useCallback(
    (question_id: string, option_id: string) => {
      saveChain.current = saveChain.current.then(async () => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const assessment_id = await ensureAssessment();
            const { error } = await supabase
              .from("assessment_answers")
              .upsert({ assessment_id, question_id, option_id }, { onConflict: "assessment_id,question_id" });
            if (error) throw error;
            setProblem(null);
            return;
          } catch (e) {
            if (attempt === 3) {
              console.error(e);
              setProblem("Having trouble saving — your answers are kept on this screen and we'll retry at the end.");
            } else await wait(600 * attempt);
          }
        }
      });
    },
    [ensureAssessment, supabase],
  );

  const onAnswer = (questionId: string, optionId: string) => {
    setAnswers((cur) => ({ ...cur, [questionId]: optionId }));
    save(questionId, optionId);
  };

  const finish = useCallback(async () => {
    setScene({ kind: "calculating" });
    setProblem(null);
    try {
      await saveChain.current;
      const assessment_id = await ensureAssessment();
      // Re-send everything once so a dropped save can never block scoring.
      const rows = Object.entries(answersRef.current)
        .filter(([qid]) => activeIds.has(qid))
        .map(([question_id, option_id]) => ({ assessment_id, question_id, option_id }));
      const up = await supabase.from("assessment_answers").upsert(rows, { onConflict: "assessment_id,question_id" });
      if (up.error) throw up.error;
      const { error } = await supabase.rpc("complete_assessment", { p_assessment_id: assessment_id });
      if (error) throw error;
      router.push(`/result/${assessment_id}`);
    } catch (e) {
      console.error(e);
      setProblem("We couldn't finish scoring just now. Check your connection and try again.");
      setScene({ kind: "picker" });
    }
  }, [activeIds, ensureAssessment, router, supabase]);

  const onAreaComplete = () => {
    if (areas.every((a) => isDone(a, answersRef.current))) finish();
    else setScene({ kind: "picker" });
  };

  const pick = (areaId: string, auto = false) => {
    if (auto) autoLaunched.current.add(areaId);
    setScene({ kind: "area", areaId });
  };

  const current = scene.kind === "area" ? areas.find((a) => a.id === scene.areaId) : undefined;
  const allDone = doneIds.size === areas.length && areas.length > 0;

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="fixed inset-x-0 top-0 z-50 h-[3px] bg-line/60"
        role="progressbar"
        aria-label="Overall progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
      >
        <motion.div
          className="h-full origin-left bg-ink/70"
          initial={false}
          animate={{ scaleX: total ? answered / total : 0 }}
          transition={SPRING}
        />
      </div>

      <LayoutGroup>
        <AnimatePresence>
          {scene.kind === "picker" && (
            <AreaPicker
              key="picker"
              areas={areas}
              doneIds={doneIds}
              resumed={resumed}
              allDone={allDone}
              canAutoLaunch={(id) => !autoLaunched.current.has(id)}
              onPick={pick}
              onFinish={finish}
            />
          )}
          {current && (
            <AreaScreen
              key={`area-${current.id}`}
              area={current}
              answers={answers}
              onAnswer={onAnswer}
              onExit={() => setScene({ kind: "picker" })}
              onComplete={onAreaComplete}
            />
          )}
          {scene.kind === "calculating" && <Calculating key="calc" areas={areas} />}
        </AnimatePresence>
      </LayoutGroup>

      <AnimatePresence>
        {problem && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-lg"
          >
            {problem}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
