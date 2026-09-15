"use client";

import { useState } from "react";
import { Button, Chip, Modal, type UseOverlayStateReturn } from "@heroui/react";
import { Medal } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { useMyIdentities, useSubmitQuizAttemptMutation } from "@/features/operators/hooks/useMyFeedback";
import type { QuizRow } from "@/features/operators/types";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to submit this quiz.";
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/** Take/submit an existing quiz — ported from the old frontend's quiz
 * dialog inside `OperatorFeedbacks.tsx`. Only writes `quiz_attempts` (see
 * `operatorFeedbackSelfApi`'s doc comment for why the parent `quizzes`
 * row's status is deliberately not updated from here). */
export function QuizModal({
  state,
  quiz,
  attemptNumber,
  onSubmitted,
}: {
  state: UseOverlayStateReturn;
  quiz: QuizRow | null;
  attemptNumber: number;
  onSubmitted: (result: { score: number; passed: boolean }) => void;
}) {
  const identities = useMyIdentities();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const submit = useSubmitQuizAttemptMutation();

  const questions = quiz?.questions ?? [];
  const question = questions[currentQuestion];

  function handleClose() {
    setCurrentQuestion(0);
    setAnswers([]);
    setError(null);
    submit.reset();
    state.close();
  }

  async function handleSubmit() {
    if (!quiz || submit.isPending) return; // guard double-submit
    setError(null);
    const correctCount = answers.filter((answer, index) => answer === questions[index]?.correct).length;
    const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const passed = score >= 80;
    try {
      await submit.mutateAsync({
        quizId: quiz.id,
        operatorName: identities[0] ?? "",
        score,
        passed,
        answers,
        attemptNumber,
      });
      onSubmitted({ score, passed });
      handleClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal isOpen={state.isOpen} onOpenChange={(open) => (open ? state.setOpen(true) : handleClose())}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Comprehension check</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              {!question ? (
                <p className="text-sm text-foreground/60">This quiz has no questions.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Chip size="sm" variant="soft">
                      <Chip.Label>
                        Question {currentQuestion + 1} of {questions.length}
                      </Chip.Label>
                    </Chip>
                  </div>
                  <h3 className="text-base font-medium text-foreground">{question.question}</h3>
                  <div className="flex flex-col gap-2">
                    {question.options.map((option, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant={answers[currentQuestion] === index ? "primary" : "secondary"}
                        className="justify-start text-left"
                        onPress={() => {
                          const next = [...answers];
                          next[currentQuestion] = index;
                          setAnswers(next);
                        }}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </>
              )}
              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                isDisabled={currentQuestion === 0}
                onPress={() => setCurrentQuestion((q) => Math.max(0, q - 1))}
              >
                Previous
              </Button>
              {currentQuestion === questions.length - 1 ? (
                <Button
                  variant="primary"
                  isDisabled={answers.length !== questions.length || submit.isPending}
                  onPress={() => void handleSubmit()}
                >
                  <Medal className="size-3.5" aria-hidden="true" />
                  {submit.isPending ? "Submitting…" : "Finish"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  isDisabled={answers[currentQuestion] === undefined}
                  onPress={() => setCurrentQuestion((q) => q + 1)}
                >
                  Next
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
