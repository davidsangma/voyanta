type UserBubbleProps = {
  text: string;
};

export function UserBubble({ text }: UserBubbleProps) {
  return (
    <div className="flex justify-end animate-float-up">
      <div className="max-w-[88%] rounded-3xl rounded-tr-md border border-[#d7dbe8] bg-[#e9edf4] px-4 py-2 text-[#27304a] shadow-soft sm:max-w-md">
        {text}
      </div>
    </div>
  );
}
