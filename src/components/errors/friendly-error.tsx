"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  reset?: () => void;
  actionLabel?: string;
  className?: string;
};

export function FriendlyError({
  title = "Something went wrong",
  description = "We hit a snag. Try again or head back home while we sort this out.",
  reset,
  actionLabel = "Try again",
  className,
}: Props) {
  return (
    <div className={cn("flex min-h-[420px] w-full items-center justify-center p-8", className)}>
      <div className="flex max-w-4xl flex-col items-center gap-6 rounded-2xl border border-border/70 bg-card/70 p-8 shadow-sm backdrop-blur">
        <div className="w-full max-w-md">
          <NotFoundIllustration />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-xl">{description}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          {reset ? (
            <Button onClick={reset}>{actionLabel}</Button>
          ) : null}
          <Button asChild variant="secondary">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

const NotFoundIllustration = () => (
  <svg
    width="248"
    height="180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="mx-auto opacity-80"
    role="img"
    aria-hidden="true"
  >
    <mask id="a" maskUnits="userSpaceOnUse" x="0" y="0" width="248" height="180">
      <path
        d="M186.247 4.835c40.868 77.898 61.374 125.727 61.516 143.488.34 42.753-58.732 25.153-76.127 29.006-42.353 9.381-49.946-13.718-107.424-3.697-49.627 8.652-78.14-55.347-57.34-96.457C9.066 72.84 7.88 47.114 3.317 0l182.93 4.835Z"
        fill="#fff"
      />
    </mask>
    <g mask="url(#a)">
      <mask id="b" maskUnits="userSpaceOnUse" x="26" y="4" width="163" height="161">
        <path
          d="m150.877 4.034 37.925 37.926-43.633 43.63 40.605 40.605-37.925 37.925-40.604-40.604-40.171 40.172-37.925-37.926 40.171-40.17-43.199-43.2L64.046 4.467l43.199 43.2 43.632-43.633Z"
          fill="#fff"
        />
      </mask>
      <g mask="url(#b)">
        <path
          d="m150.876 4.035 37.925 37.926-43.633 43.63 40.605 40.605-37.925 37.925-40.604-40.604-40.171 40.172-37.925-37.926 40.172-40.17-43.2-43.2L64.045 4.468l43.199 43.2 43.632-43.633Z"
          fill="#3D66EE"
        />
        <mask id="c" maskUnits="userSpaceOnUse" x="-35" y="-68" width="262" height="262">
          <path d="M226.836-67.297H-34.448v261.285h261.284V-67.297Z" fill="#fff" />
        </mask>
        <g mask="url(#c)">
          <path d="M226.837-67.297H-34.447v261.285h261.284V-67.297Z" fill="url(#d)" />
          <path
            d="M69.861-67.297c3.694 47.974 20.883 77.016 51.567 87.124 30.684 10.11 72.376-4.411 125.078-43.561"
            stroke="#121212"
            strokeWidth=".919"
          />
          <path
            d="M88.018-67.297c8.178 56.4-10.189 85.54-55.1 87.419-67.366 2.817-18.696-48.342 4.287-27.948 22.982 20.394 21.11 64.552-14.749 94.819-23.906 20.177-51.144 30.265-81.712 30.265m286.093-29.622c-99.556-6.433-178.525 29.018-236.908 106.352"
            stroke="#121212"
            strokeWidth=".919"
          />
          <path d="M-34.448 86.894C30.855 104.4 72.956 140.097 91.853 193.988" stroke="#686868" strokeWidth=".919" />
          <path
            d="M226.836 24.98c-44.063 43.985-74.82 56.773-92.274 38.365-26.179-27.612 23.827-49.354 31.203-24.677 7.376 24.677-32.058 44.262-84.56 52.972-35.002 5.808-76.42 31.211-124.253 76.212m172.56 26.136c-6.476-38.445 1.993-59.066 25.406-61.864 23.414-2.799 49.446 7.512 78.098 30.932"
            stroke="#121212"
            strokeWidth=".919"
          />
          <path d="M226.837 53.56c-41.709 40.665-59.608 89.964-53.695 147.9" stroke="#686868" strokeWidth=".919" />
          <path
            d="M-34.448 32.348C68.57 53.162 149.409 109.532 208.068 201.459m-242.516-61.018c24.519 36.547 50.5 45.685 77.944 27.41 41.166-27.41 55.123-33.1 72.28-27.41 11.439 3.794 21.84 21.643 31.204 53.547"
            stroke="#121212"
            strokeWidth=".919"
          />
        </g>
      </g>
      <mask id="e" maskUnits="userSpaceOnUse" x="168" y="147" width="29" height="16">
        <path d="M196.231 147.792v14.689h-27.42v-14.689h27.42Z" fill="#fff" />
      </mask>
      <g mask="url(#e)">
        <path
          d="M196.231 147.792v14.689h-27.42v-14.689h27.42Z"
          fill="#686868"
          stroke="#353535"
          strokeWidth=".919"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M214.774 158.573c0 9.163-6.877 16.59-15.361 16.59-8.484 0-15.361-7.427-15.361-16.59 0-9.162 6.877-16.59 15.361-16.59 8.484 0 15.361 7.428 15.361 16.59Z"
          fill="#353535"
        />
      </g>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M82.553 80.46c-9.151 10.132-16.659 17.844-22.522 23.136-13.316 12.02-17.581 20.331-23.582 25.371-3.967 3.33-16.278.03-24.894.03-10.875 0-23.395 2.994-28.86 6.558-7.868 5.132-7.823 15.474.138 31.026h72.76L127.5 91.359 115.009 79.33c-8.993-8.66-23.302-8.391-31.963.602-.167.173-.33.35-.493.528Z"
        fill="#686868"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M-17.168 155.86c6.216-2.228 14.937-3.652 26.165-4.274 16.841-.932 25.332 5.621 34.282.927 8.948-4.693 14.827-19.99 22.591-28.822 7.764-8.833 10.936-9.019 18.168-17.245 2.955-3.362 5.775-6.608 8.46-9.738a7.033 7.033 0 0 1 10.311-.394l10.132 10.132"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M105.419 121.5a19.237 19.237 0 0 1-3.102-23.353l.451-.778"
        stroke="#353535"
        strokeWidth="1.075"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M103.453 123.683a22.302 22.302 0 0 1-3.546-27.123l.679-1.157"
        stroke="#353535"
        strokeWidth=".502"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1.51 1.51"
      />
      <path d="M75.06 166.202v-27.42H56.68v27.42h18.38Z" fill="#686868" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M74.428 135.068H42.232a3.898 3.898 0 0 0-3.9 3.901 3.898 3.898 0 0 0 3.9 3.9H58.3"
        fill="#686868"
      />
      <path
        d="M74.428 135.068H42.232a3.898 3.898 0 0 0-3.9 3.901 3.898 3.898 0 0 0 3.9 3.9H58.3"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="m60.62 163.582-5.016 2.888a3.875 3.875 0 0 0-1.905 3.853c.065.504.23.989.483 1.43l.004.007a3.884 3.884 0 0 0 5.301 1.421l12.92-7.44"
        fill="#686868"
      />
      <path
        d="m60.62 163.582-5.016 2.888a3.875 3.875 0 0 0-1.905 3.853c.065.504.23.989.483 1.43l.004.007a3.884 3.884 0 0 0 5.301 1.421l12.92-7.44"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M58.276 142.834H42.14a3.823 3.823 0 0 0-3.565 2.339 3.812 3.812 0 0 0 .839 4.181 3.823 3.823 0 0 0 2.726 1.097h16.136"
        fill="#686868"
      />
      <path
        d="M58.276 142.834H42.14a3.823 3.823 0 0 0-3.565 2.339 3.812 3.812 0 0 0 .839 4.181 3.823 3.823 0 0 0 2.726 1.097h16.136"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M58.406 150.45H42.141a3.81 3.81 0 0 0-2.66 6.483 3.81 3.81 0 0 0 2.66 1.134h16.265"
        fill="#686868"
      />
    </g>
    <defs>
      <linearGradient id="d" x1="96.222" y1="-67.297" x2="96.222" y2="193.988" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E9F1FF" />
        <stop offset="1" stopColor="#F8FBFF" />
      </linearGradient>
    </defs>
  </svg>
);
