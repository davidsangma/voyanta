type UserBubbleProps = {
  text: string;
};

export function UserBubble({ text }: UserBubbleProps) {
  return (
    <div className="flex justify-end animate-float-up">
      <div
        className="max-w-[80%] rounded-3xl rounded-tr-md px-5 py-3 text-sm font-medium text-white shadow-glow sm:text-base"
        style={{ backgroundImage: "var(--gradient-bubble-user)" }}
      >
        {text}
      </div>
    </div>
  );
}
