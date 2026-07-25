import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomFeedSetup } from "@/components/custom-feed-setup";

describe("custom feed setup", () => {
  it("labels every example as unaffiliated and offers adjustment by URL", () => {
    render(<CustomFeedSetup />);

    expect(screen.getByText("Unaffiliated examples")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exploring Mormon Thought.*Unaffiliated sample/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sold a Story.*Unaffiliated sample/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /The Miracle Files.*Unaffiliated sample/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Podcast link or existing Podcast Pacer feed")).toBeInTheDocument();
  });
});
