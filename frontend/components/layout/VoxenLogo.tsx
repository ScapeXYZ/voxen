import Link from "next/link";
export function VoxenLogo() {
  return (
    <Link href="/" className="wordmark" aria-label="Voxen home">
      <svg
        width="29"
        height="30"
        viewBox="0 0 29 30"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 4L14.5 26L27 4M8 4L14.5 16L21 4"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <circle cx="14.5" cy="26" r="2.5" fill="currentColor" />
      </svg>
      voxen
    </Link>
  );
}
