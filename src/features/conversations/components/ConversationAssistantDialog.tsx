"use client";

import { Modal } from "@heroui/react";
import { ConversationAssistantPanel } from "@/features/conversations/components/ConversationAssistantPanel";
import type { Conversation } from "@/features/conversations/types";

export interface ConversationAssistantDialogProps {
  conversation: Conversation;
  workspaceId: string | null;
  onClose: () => void;
}

export function ConversationAssistantDialog({
  conversation,
  workspaceId,
  onClose,
}: ConversationAssistantDialogProps) {
  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog className="flex max-h-[min(720px,90vh)] flex-col">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>AI assistant — {conversation.client_name || "Conversation"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex min-h-[420px] flex-1 flex-col">
              <ConversationAssistantPanel conversation={conversation} workspaceId={workspaceId} />
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
