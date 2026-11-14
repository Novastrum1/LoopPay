"use client";
import { Button } from "../components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="workspace">
      <h1>A small interruption.</h1>
      <p>We couldn’t load this page. Check your network and try again.</p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
