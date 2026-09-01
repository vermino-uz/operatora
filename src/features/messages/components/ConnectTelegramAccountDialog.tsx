"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Label, Modal, TextField } from "@heroui/react";
import { QRCodeSVG } from "qrcode.react";
import { CircleExclamation, Person, ShieldCheck } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { telegramAccountApi, type TelegramAccountProtocol } from "@/services/api/telegramAccount";
import { LoadingState } from "@/components/shared/LoadingState";

type Step = "intro" | "phone" | "code" | "2fa" | "qr" | "qr-2fa" | "done" | "error";

export interface ConnectTelegramAccountDialogProps {
  canManage: boolean;
  hasActiveSession: boolean;
  initialProtocol?: TelegramAccountProtocol;
  onConnected: () => void;
  onClose: () => void;
}

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function isQrWaitPending(status: number, data: Record<string, unknown>): boolean {
  if (data.pending === true) return true;
  return status === 202 && data.pending === true;
}

function refreshedQrUrl(data: Record<string, unknown>): string | null {
  const url = data.qrUrl ?? data.qr_url;
  return typeof url === "string" && url.length > 0 ? url : null;
}

function isQrLoginComplete(data: Record<string, unknown>): boolean {
  return Boolean(
    data.sessionId ?? data.session_id ?? data.telegramUserId ?? data.telegram_user_id,
  );
}

async function hasActiveLinkedSession(): Promise<boolean> {
  try {
    const settings = await telegramAccountApi.getSettings();
    return settings.connection_mode === "user_account" && settings.session?.status === "active";
  } catch {
    return false;
  }
}

export function ConnectTelegramAccountDialog({
  canManage,
  hasActiveSession,
  initialProtocol = "pyrogram",
  onConnected,
  onClose,
}: ConnectTelegramAccountDialogProps) {
  const [step, setStep] = useState<Step>("intro");
  const [phone, setPhone] = useState("");
  const [loginId, setLoginId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [protocol, setProtocol] = useState<TelegramAccountProtocol>(initialProtocol);
  const [qrUrl, setQrUrl] = useState("");
  const pollAbortRef = useRef(false);

  useEffect(() => () => {
    pollAbortRef.current = true;
  }, []);

  const loginInProgress = step === "phone" || step === "code" || step === "2fa" || step === "qr" || step === "qr-2fa" || busy;

  function resetState() {
    pollAbortRef.current = true;
    setStep("intro");
    setPhone("");
    setLoginId("");
    setCode("");
    setPassword("");
    setErrorMsg("");
    setQrUrl("");
    setBusy(false);
  }

  async function startPhoneLogin() {
    if (!phone.trim() || busy) return;
    setBusy(true);
    setErrorMsg("");
    try {
      const data = await telegramAccountApi.loginStart(phone.trim(), protocol);
      setLoginId(data.loginId);
      setStep("code");
    } catch (err) {
      setErrorMsg(actionErrorMessage(err));
      setStep("error");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(withPassword = false) {
    if (!loginId || !code.trim() || busy) return;
    setBusy(true);
    setErrorMsg("");
    try {
      await telegramAccountApi.loginVerify({
        loginId,
        code: code.trim(),
        protocol,
        ...(withPassword && password.trim() ? { password: password.trim() } : {}),
      });
      const linked = await hasActiveLinkedSession();
      if (!linked) {
        throw new Error("Login did not complete. Check the code and try again.");
      }
      setStep("done");
      onConnected();
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401 && !withPassword) {
        setStep("2fa");
        return;
      }
      const msg = actionErrorMessage(err);
      if (msg.toLowerCase().includes("2fa") || msg.toLowerCase().includes("password")) {
        setStep("2fa");
      } else {
        setErrorMsg(msg);
        setStep("error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function pollQrLogin(activeLoginId: string) {
    while (!pollAbortRef.current) {
      try {
        const { status, data } = await telegramAccountApi.loginQrWait({
          loginId: activeLoginId,
          timeoutSec: 25,
          protocol,
        });
        if (pollAbortRef.current) return;

        if (status === 408) continue;

        const payload = data as Record<string, unknown>;

        if (isQrWaitPending(status, payload)) {
          const nextQrUrl = refreshedQrUrl(payload);
          if (nextQrUrl) setQrUrl(nextQrUrl);
          continue;
        }

        if (status === 401) {
          pollAbortRef.current = true;
          setStep("qr-2fa");
          return;
        }

        if (status >= 400) {
          setErrorMsg(typeof payload.message === "string" ? payload.message : "QR login failed.");
          setStep("error");
          return;
        }

        if (!isQrLoginComplete(payload)) {
          continue;
        }

        const linked = await hasActiveLinkedSession();
        if (pollAbortRef.current) return;
        if (!linked) {
          continue;
        }

        setStep("done");
        onConnected();
        return;
      } catch {
        if (pollAbortRef.current) return;
      }
    }
  }

  async function startQrLogin() {
    if (busy) return;
    setBusy(true);
    setErrorMsg("");
    try {
      const data = await telegramAccountApi.loginQrStart(protocol);
      setLoginId(data.loginId);
      setQrUrl(data.qrUrl);
      setStep("qr");
      pollAbortRef.current = false;
      void pollQrLogin(data.loginId);
    } catch (err) {
      setErrorMsg(actionErrorMessage(err));
      setStep("error");
    } finally {
      setBusy(false);
    }
  }

  async function submitQrPassword() {
    if (!loginId || !password.trim() || busy) return;
    pollAbortRef.current = true;
    setBusy(true);
    setErrorMsg("");
    try {
      await telegramAccountApi.loginQrPassword({ loginId, password: password.trim(), protocol });
      const linked = await hasActiveLinkedSession();
      if (!linked) {
        throw new Error("Login did not complete. Check your cloud password and try again.");
      }
      setStep("done");
      onConnected();
    } catch (err) {
      const msg = actionErrorMessage(err);
      if (msg.toLowerCase().includes("password")) {
        setErrorMsg(msg);
        setStep("qr-2fa");
      } else {
        setErrorMsg(msg);
        setStep("error");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen
      onOpenChange={(open) => {
        if (!open && !loginInProgress) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <Person className="size-5 text-[#26A5E4]" aria-hidden="true" />
                Link Telegram account
              </Modal.Heading>
              <p className="text-sm text-foreground/60">
                Connect a personal Telegram account to read and reply from your full inbox — including chats that never messaged your bot.
              </p>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              {!canManage ? (
                <p className="text-sm text-foreground/70">Only the workspace owner can link a Telegram account.</p>
              ) : (
                <>
                  <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>
                      Linking your personal account replaces the Business bot inbox for this workspace. Disconnect the account later to use the bot again.
                    </span>
                  </div>

                  <div className="flex gap-2 rounded-lg border border-black/10 bg-[var(--default)] px-3 py-2 text-xs text-foreground/70 dark:border-white/10">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-foreground/45" aria-hidden="true" />
                    <span>Your session is encrypted and stored securely. Only workspace members with inbox access can read these chats.</span>
                  </div>

                  {step === "intro" ? (
                    <div className="space-y-4">
                      <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/70">
                        <li>Sync your existing Telegram chat history</li>
                        <li>Start new chats by phone or username</li>
                        <li>Access contacts and Telegram chat folders</li>
                      </ul>

                      <div className="space-y-1.5">
                        <Label>Connection engine</Label>
                        {hasActiveSession ? (
                          <p className="text-xs text-foreground/60">
                            {protocol === "tdlib" ? "TDLib (recommended for forum topics)" : "Standard (Pyrogram)"} — locked while a session is active.
                          </p>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setProtocol("pyrogram")}
                              className={`h-9 flex-1 rounded-lg border text-sm font-medium ${
                                protocol === "pyrogram"
                                  ? "border-[#26A5E4] bg-[#26A5E4]/10 text-[#1b7fb0]"
                                  : "border-black/10 text-foreground/70 dark:border-white/10"
                              }`}
                            >
                              Standard
                            </button>
                            <button
                              type="button"
                              onClick={() => setProtocol("tdlib")}
                              className={`h-9 flex-1 rounded-lg border text-sm font-medium ${
                                protocol === "tdlib"
                                  ? "border-[#26A5E4] bg-[#26A5E4]/10 text-[#1b7fb0]"
                                  : "border-black/10 text-foreground/70 dark:border-white/10"
                              }`}
                            >
                              TDLib
                            </button>
                          </div>
                        )}
                      </div>

                      <Button fullWidth onPress={() => void startQrLogin()} isDisabled={busy}>
                        {busy ? "Starting…" : "Log in with QR code"}
                      </Button>
                      <Button fullWidth variant="secondary" onPress={() => setStep("phone")} isDisabled={busy}>
                        Log in with phone number
                      </Button>
                    </div>
                  ) : null}

                  {step === "qr" ? (
                    <div className="space-y-3 text-center">
                      <p className="text-sm font-medium">Scan with Telegram</p>
                      <div className="flex justify-center">
                        <div className="rounded-lg border border-black/10 bg-white p-3 dark:border-white/10">
                          {qrUrl ? <QRCodeSVG value={qrUrl} size={200} /> : <LoadingState label="Generating QR…" className="h-[200px] w-[200px]" />}
                        </div>
                      </div>
                      <ol className="list-decimal space-y-1 pl-5 text-left text-sm text-foreground/70">
                        <li>Open Telegram on your phone</li>
                        <li>Settings → Devices → Link Desktop Device</li>
                        <li>Scan this QR code</li>
                      </ol>
                      <p className="text-xs text-foreground/50">Waiting for you to scan the QR code in Telegram…</p>
                      <Button
                        variant="secondary"
                        fullWidth
                        onPress={() => {
                          pollAbortRef.current = true;
                          resetState();
                        }}
                      >
                        Use phone number instead
                      </Button>
                    </div>
                  ) : null}

                  {step === "qr-2fa" ? (
                    <div className="space-y-3">
                      <p className="text-xs text-foreground/60">This account has two-step verification enabled.</p>
                      <TextField>
                        <Label>Cloud password</Label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
                      </TextField>
                      <Button fullWidth onPress={() => void submitQrPassword()} isDisabled={busy || !password.trim()}>
                        {busy ? "Verifying…" : "Verify"}
                      </Button>
                    </div>
                  ) : null}

                  {step === "phone" ? (
                    <div className="space-y-3">
                      <TextField>
                        <Label>Phone number</Label>
                        <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" fullWidth />
                      </TextField>
                      <p className="text-xs text-foreground/50">Include country code. Telegram will send a login code to the app.</p>
                      <Button fullWidth onPress={() => void startPhoneLogin()} isDisabled={busy || !phone.trim()}>
                        {busy ? "Sending…" : "Send code"}
                      </Button>
                    </div>
                  ) : null}

                  {step === "code" || step === "2fa" ? (
                    <div className="space-y-3">
                      <TextField>
                        <Label>Verification code</Label>
                        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="12345" fullWidth />
                      </TextField>
                      {step === "2fa" ? (
                        <TextField>
                          <Label>Cloud password</Label>
                          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
                        </TextField>
                      ) : null}
                      <Button fullWidth onPress={() => void verifyCode(step === "2fa")} isDisabled={busy || !code.trim()}>
                        {busy ? "Verifying…" : "Verify"}
                      </Button>
                    </div>
                  ) : null}

                  {step === "done" ? (
                    <div className="space-y-3 py-2 text-center">
                      <p className="text-sm font-medium">Account linked</p>
                      <p className="text-sm text-foreground/70">Your Telegram inbox is syncing. Chats will appear shortly.</p>
                      <Button fullWidth onPress={onClose}>
                        Done
                      </Button>
                    </div>
                  ) : null}

                  {step === "error" ? (
                    <div className="space-y-3">
                      <div className="flex gap-2 text-sm text-danger">
                        <CircleExclamation className="size-4 shrink-0" aria-hidden="true" />
                        <span>{errorMsg || "Something went wrong."}</span>
                      </div>
                      <Button
                        variant="secondary"
                        fullWidth
                        onPress={() => {
                          resetState();
                          setStep("intro");
                        }}
                      >
                        Try again
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
