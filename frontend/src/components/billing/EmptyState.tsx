interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="h-full bg-surface/50 border border-dashed border-line rounded-2xl flex flex-col items-center justify-center p-12 text-center text-foreground min-h-[400px]">
      <div className="w-16 h-16 bg-line rounded-full flex items-center justify-center mb-4 text-foreground">
        <svg
          className="w-8 h-8"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              strokeDasharray="64"
              strokeWidth="2"
              d="M13 3l6 6v12h-14v-18h8"
            >
              <animate
                fill="freeze"
                attributeName="stroke-dashoffset"
                dur="0.6s"
                values="64;0"
              />
            </path>
            <path
              strokeDasharray="14"
              strokeDashoffset="14"
              d="M12.5 3v5.5h6.5"
            >
              <animate
                fill="freeze"
                attributeName="stroke-dashoffset"
                begin="0.7s"
                dur="0.2s"
                to="0"
              />
            </path>
            <g strokeWidth="2">
              <path
                strokeDasharray="6"
                strokeDashoffset="6"
                d="M9 13h4"
              >
                <animate
                  fill="freeze"
                  attributeName="stroke-dashoffset"
                  begin="0.9s"
                  dur="0.2s"
                  to="0"
                />
              </path>
              <path
                strokeDasharray="8"
                strokeDashoffset="8"
                d="M9 16h6"
              >
                <animate
                  fill="freeze"
                  attributeName="stroke-dashoffset"
                  begin="1.1s"
                  dur="0.2s"
                  to="0"
                />
              </path>
            </g>
          </g>
        </svg>
      </div>
      <p className="font-medium">{message}</p>
    </div>
  );
}
