import { specialists } from "@/server/ai/appointment";
import { researchTopics } from "@/server/ai/research";
import { AssistantClient } from "@/components/assistant/assistant-client";

export default function AssistantPage() {
  return <AssistantClient specialists={specialists()} topics={researchTopics()} />;
}
