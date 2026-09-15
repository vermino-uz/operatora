"use client";

import { useState } from "react";
import { Button, Chip, Tabs, useOverlayState } from "@heroui/react";
import { BookOpen, CircleCheck, CircleQuestion, Clock, CircleXmark } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  useMyApprovedFeedbackQuery,
  useMyIdentities,
  useMyQuizAttemptsQuery,
  useMyQuizzesQuery,
} from "@/features/operators/hooks/useMyFeedback";
import { QuizModal } from "@/features/operators/components/QuizModal";
import type { QuizRow } from "@/features/operators/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Operator Feedbacks (`/operator-feedbacks`) — the operator's own view of
 * coaching feedback sent to them and any comprehension quizzes attached
 * to it. See `operatorFeedbackSelfApi`'s doc comment for the full
 * backend trace and the confirmed gap (no "generate quiz" action here —
 * the backend's real `/fn/generate-feedback-quiz` handler doesn't
 * persist a `quizzes` row, so offering that button would fake a
 * capability that doesn't actually work end-to-end).
 *
 * Old page reference: `pages/OperatorFeedbacks.tsx`. Content rendering
 * is plain text (`whitespace-pre-wrap`) rather than the old page's
 * markdown-to-HTML + `dangerouslySetInnerHTML` (`SafeHtml`) — feedback
 * `content` is admin-authored free text, not worth reintroducing an HTML
 * injection surface for a handful of `**bold**`/bullet conventions.
 */
export function OperatorFeedbacksPageContent() {
  const identities = useMyIdentities();
  const [tab, setTab] = useState<"feedback" | "quizzes">("feedback");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeQuiz, setActiveQuiz] = useState<QuizRow | null>(null);
  const quizState = useOverlayState();

  const feedbackQuery = useMyApprovedFeedbackQuery(identities);
  const quizzesQuery = useMyQuizzesQuery(identities);
  const attemptsQuery = useMyQuizAttemptsQuery(identities.length > 0);

  if (identities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState title="No profile found" description="We couldn't determine your operator identity yet." />
      </div>
    );
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const feedbacks = feedbackQuery.data ?? [];
  const quizzes = quizzesQuery.data ?? [];
  const attempts = attemptsQuery.data ?? [];

  function quizForFeedback(feedbackId: string): QuizRow | undefined {
    return quizzes.find((q) => q.feedback_id === feedbackId);
  }
  function attemptForQuiz(quizId: string) {
    return attempts.find((a) => a.quiz_id === quizId);
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6">
      <h1 className="text-2xl font-bold text-foreground">My Feedback</h1>
      <p className="mt-1 text-sm text-foreground/60">Coaching feedback sent to you and any comprehension checks attached to it.</p>

      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as "feedback" | "quizzes")} className="mt-6">
        <Tabs.List>
          <Tabs.Tab id="feedback">
            <BookOpen className="mr-1.5 inline size-4" aria-hidden="true" />
            Feedback ({feedbacks.length})
          </Tabs.Tab>
          <Tabs.Tab id="quizzes">
            <CircleQuestion className="mr-1.5 inline size-4" aria-hidden="true" />
            My results ({attempts.length})
          </Tabs.Tab>
        </Tabs.List>

          <Tabs.Panel id="feedback">
            {feedbackQuery.isLoading ? (
              <LoadingState label="Loading feedback…" />
            ) : feedbackQuery.isError ? (
              <ErrorState error={feedbackQuery.error} onRetry={() => feedbackQuery.refetch()} />
            ) : feedbacks.length === 0 ? (
              <EmptyState title="No feedback yet" description="Approved coaching feedback will show up here." />
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {feedbacks.map((fb) => {
                  const quiz = quizForFeedback(fb.id);
                  const attempt = quiz ? attemptForQuiz(quiz.id) : undefined;
                  const isExpanded = expanded.has(fb.id);
                  const isLong = fb.content.length > 300;
                  const shown = isExpanded || !isLong ? fb.content : `${fb.content.slice(0, 300)}…`;

                  return (
                    <div key={fb.id} className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{fb.title}</h3>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-foreground/50">
                            <Clock className="size-3" aria-hidden="true" />
                            {formatDate(fb.approved_at ?? fb.created_at)}
                          </p>
                        </div>
                        {quiz ? (
                          <Chip size="sm" color="success" variant="soft">
                            <Chip.Label>Quiz available</Chip.Label>
                          </Chip>
                        ) : null}
                      </div>

                      <div className="mt-3 rounded-xl bg-black/[0.03] p-4 dark:bg-white/[0.05]">
                        <p className="whitespace-pre-wrap text-sm text-foreground">{shown}</p>
                        {isLong ? (
                          <Button size="sm" variant="ghost" className="mt-2" onPress={() => toggleExpanded(fb.id)}>
                            {isExpanded ? "Show less" : "Show more"}
                          </Button>
                        ) : null}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-black/[0.06] pt-3 dark:border-white/[0.08]">
                        <p className="text-sm text-foreground/60">Comprehension check</p>
                        {quiz && attempt ? (
                          <Chip size="sm" color={attempt.passed ? "success" : "danger"} variant="soft">
                            <Chip.Label className="flex items-center gap-1">
                              {attempt.passed ? <CircleCheck className="size-3" /> : <CircleXmark className="size-3" />}
                              {attempt.passed ? `Passed ${attempt.score}%` : `Failed ${attempt.score}%`}
                            </Chip.Label>
                          </Chip>
                        ) : quiz ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onPress={() => {
                              setActiveQuiz(quiz);
                              quizState.open();
                            }}
                          >
                            Start quiz
                          </Button>
                        ) : (
                          <span className="text-xs text-foreground/40">No quiz yet</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Tabs.Panel>

          <Tabs.Panel id="quizzes">
            {attemptsQuery.isLoading ? (
              <LoadingState label="Loading results…" />
            ) : attemptsQuery.isError ? (
              <ErrorState error={attemptsQuery.error} onRetry={() => attemptsQuery.refetch()} />
            ) : attempts.length === 0 ? (
              <EmptyState title="No quiz results yet" description="Your comprehension check results will show up here." />
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {attempts.map((attempt) => {
                  const quiz = quizzes.find((q) => q.id === attempt.quiz_id);
                  const feedback = quiz ? feedbacks.find((f) => f.id === quiz.feedback_id) : undefined;
                  return (
                    <div key={attempt.id} className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{feedback?.title ?? "Quiz result"}</p>
                          <p className="mt-0.5 text-xs text-foreground/50">
                            {formatDate(attempt.completed_at)}
                            {attempt.attempt_number ? ` · Attempt ${attempt.attempt_number}` : ""}
                          </p>
                        </div>
                        <Chip size="sm" color={attempt.passed ? "success" : "danger"} variant="soft">
                          <Chip.Label>{attempt.passed ? `Passed ${attempt.score}%` : `Failed ${attempt.score}%`}</Chip.Label>
                        </Chip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Tabs.Panel>
      </Tabs>

      <QuizModal
        state={quizState}
        quiz={activeQuiz}
        attemptNumber={
          activeQuiz ? attempts.filter((a) => a.quiz_id === activeQuiz.id).length + 1 : 1
        }
        onSubmitted={() => setActiveQuiz(null)}
      />
    </div>
  );
}
