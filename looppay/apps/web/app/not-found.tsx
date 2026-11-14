import Link from "next/link";
export default function NotFound() {
  return (
    <section className="workspace">
      <h1>This path is outside the Loop.</h1>
      <Link href="/">Return home →</Link>
    </section>
  );
}
