'use client';

import GeminiChat from '../components/GeminiChat';

export default function ChatProvider({ context }: { context?: string }) {
  return <GeminiChat context={context} />;
}
