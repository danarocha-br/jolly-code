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
    <div className={cn("flex min-h-screen w-full items-center justify-center p-8", className)}>
      <div className="flex max-w-4xl flex-col items-center justify-center gap-6 rounded-2xl border border-border/70 bg-card/70 p-8 shadow-sm backdrop-blur">
        <div className="w-full max-w-md mx-auto">
          <NotFoundIllustration />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-xl">{description}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <Button asChild variant="secondary">
            <Link href="/">Back to home</Link>
          </Button>
          {reset ? (
            <Button onClick={reset}>{actionLabel}</Button>
          ) : null}
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
    className="mx-auto"
  >
    <mask
      id="a"
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="248"
      height="180"
    >
      <path
        d="M186.247 4.835c40.868 77.898 61.374 125.727 61.516 143.488.34 42.753-58.732 25.153-76.127 29.006-42.353 9.381-49.946-13.718-107.424-3.697-49.627 8.652-78.14-55.347-57.34-96.457C9.066 72.84 7.88 47.114 3.317 0l182.93 4.835Z"
        fill="#fff"
      />
    </mask>
    <g mask="url(#a)">
      <mask
        id="b"
        maskUnits="userSpaceOnUse"
        x="26"
        y="4"
        width="163"
        height="161"
      >
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
        <mask
          id="c"
          maskUnits="userSpaceOnUse"
          x="-35"
          y="-68"
          width="262"
          height="262"
        >
          <path
            d="M226.836-67.297H-34.448v261.285h261.284V-67.297Z"
            fill="#fff"
          />
        </mask>
        <g mask="url(#c)">
          <path
            d="M226.837-67.297H-34.447v261.285h261.284V-67.297Z"
            fill="url(#d)"
          />
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
          <path
            d="M-34.448 86.894C30.855 104.4 72.956 140.097 91.853 193.988"
            stroke="#686868"
            strokeWidth=".919"
          />
          <path
            d="M226.836 24.98c-44.063 43.985-74.82 56.773-92.274 38.365-26.179-27.612 23.827-49.354 31.203-24.677 7.376 24.677-32.058 44.262-84.56 52.972-35.002 5.808-76.42 31.211-124.253 76.212m172.56 26.136c-6.476-38.445 1.993-59.066 25.406-61.864 23.414-2.799 49.446 7.512 78.098 30.932"
            stroke="#121212"
            strokeWidth=".919"
          />
          <path
            d="M226.837 53.56c-41.709 40.665-59.608 89.964-53.695 147.9"
            stroke="#686868"
            strokeWidth=".919"
          />
          <path
            d="M-34.448 32.348C68.57 53.162 149.409 109.532 208.068 201.459m-242.516-61.018c24.519 36.547 50.5 45.685 77.944 27.41 41.166-27.41 55.123-33.1 72.28-27.41 11.439 3.794 21.84 21.643 31.204 53.547"
            stroke="#121212"
            strokeWidth=".919"
          />
        </g>
      </g>
      <mask
        id="e"
        maskUnits="userSpaceOnUse"
        x="168"
        y="147"
        width="29"
        height="16"
      >
        <path
          d="M196.231 147.792v14.689h-27.42v-14.689h27.42Z"
          fill="#fff"
        />
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
      <path
        d="M58.406 150.45H42.141a3.81 3.81 0 0 0-2.66 6.483 3.81 3.81 0 0 0 2.66 1.134h16.265"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M58.532 158.305h-16a4.075 4.075 0 0 0-4.077 4.077 4.078 4.078 0 0 0 4.077 4.077h34.275"
        fill="#686868"
      />
      <path
        d="M58.532 158.305h-16a4.075 4.075 0 0 0-4.077 4.077 4.078 4.078 0 0 0 4.077 4.077h34.275"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M208.755 141.29c7.166 0 12.975 5.809 12.975 12.976 0 7.166-5.809 12.975-12.975 12.975h-5.758c-7.166 0-12.976-5.809-12.976-12.975 0-7.167 5.81-12.976 12.976-12.976h5.758Z"
        fill="#353535"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M217.812 145.156c1.495-2.578.077-3.866-4.253-3.866-4.331 0-7.663.231-9.999.693-.662.586-.899.981-.712 1.186 2.606 2.857 6.611 3.58 9.75 4.48 3.476.998 5.214.167 5.214-2.493Z"
        fill="#353535"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="m203.301 142.842.21-1.366a2.828 2.828 0 0 0-1.818-3.081 2.828 2.828 0 0 0-1.27-.158 5.357 5.357 0 0 0-4.609 3.92l-.187.685h7.674Z"
        fill="#686868"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M200.993 141.239h-2.389m.887 0 .902-1.117"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M206.055 142.843h-8.551c-6.493 0-11.757 5.263-11.757 11.757 0 6.493 5.264 11.757 11.757 11.757h8.551c6.493 0 11.757-5.264 11.757-11.757 0-6.494-5.264-11.757-11.757-11.757Z"
        fill="#686868"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M195.155 159.878a7.346 7.346 0 0 1-.363-10.381m5.205 5.782-3.014.484-.284-1.654"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M200.899 161.19c0-1.279.596-2.316 1.331-2.316.734 0 1.33 1.037 1.33 2.316s-.596 2.315-1.33 2.315c-.735 0-1.331-1.036-1.331-2.315Z"
        stroke="#353535"
        strokeWidth=".731"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M200.899 161.19c0-.767.596-1.389 1.331-1.389.734 0 1.33.622 1.33 1.389 0 .768-.596 1.39-1.33 1.39-.735 0-1.331-.622-1.331-1.39Z"
        fill="#353535"
      />
      <path
        d="M200.899 148.364c0-1.279.596-2.316 1.331-2.316.734 0 1.33 1.037 1.33 2.316s-.596 2.316-1.33 2.316c-.735 0-1.331-1.037-1.331-2.316Z"
        stroke="#353535"
        strokeWidth=".731"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M200.899 148.364c0-.767.596-1.389 1.331-1.389.734 0 1.33.622 1.33 1.389 0 .768-.596 1.389-1.33 1.389-.735 0-1.331-.621-1.331-1.389Z"
        fill="#353535"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M219.006 159.873c2.146-8.631 1.748-15.139-1.194-19.525-4.415-6.578-16.567-.764-12.595 13.731 2.648 9.664 7.244 11.595 13.789 5.794Z"
        fill="#353535"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M216.491 165.358c3.538-.906 9.391-11.429 7.584-16.958-1.204-3.687-5.382-2.617-12.535 3.208.943 9.77 2.594 14.353 4.951 13.75Z"
        fill="#353535"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M220.084 161.886c3.115 1.913 3.115 3.38 0 4.403-3.115 1.023-8.834 1.254-17.157.692a23.579 23.579 0 0 1 9.265-5.095c3.477-.998 6.107-.998 7.892 0Z"
        fill="#353535"
      />
      <path
        d="M74.99 134.877v31.326"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="m112.94 76.57 68.234 69.38-3.502 9.057a18.372 18.372 0 0 1-17.141 11.751H75.06v-31.509l24.994-.362-4.671-4.2a13.783 13.783 0 0 1-2.869-16.878L112.94 76.57Z"
        fill="#1B1B1B"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M175.739 140.68c-3.272 6.69-4.09 13.503-2.454 20.438m-75.788-26.112h24.061"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M86.177 128.998v39.97l-13.784-1.097v-37.123l13.784-1.75Z"
        fill="#1B1B1B"
        stroke="#353535"
        strokeWidth=".919"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="m87.386 135.068 1.184 31.39h-2.394v-31.39h1.21Z"
        fill="#353535"
      />
    </g>
    <defs>
      <linearGradient
        id="d"
        x1="41.5"
        y1="112.5"
        x2="265.992"
        y2="116.472"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#3C93FE" />
        <stop offset=".251" stopColor="#B4BC8C" />
        <stop offset=".453" stopColor="#FCB543" />
        <stop offset=".656" stopColor="#EB886B" />
        <stop offset=".802" stopColor="#C57CA1" />
        <stop offset=".984" stopColor="#8266FF" />
      </linearGradient>
    </defs>
  </svg>
);
