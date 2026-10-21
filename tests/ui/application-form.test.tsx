import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationForm } from "@/components/public/application-form";

const { submitApplicationAction } = vi.hoisted(() => ({ submitApplicationAction: vi.fn() }));
vi.mock("@/app/(public)/jobs/[jobId]/apply/actions", () => ({ submitApplicationAction }));

const JOB_ID = "a1f3c2d4-5b6e-4f70-8a91-0b2c3d4e5f01";

function pdfFile(name = "cv.pdf", size = 2048) {
  return new File([new Uint8Array(size)], name, { type: "application/pdf" });
}

async function fillDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), "Jane Mukamana");
  await user.type(screen.getByLabelText(/email address/i), "jane@example.com");
  await user.type(screen.getByLabelText(/phone number/i), "+250 788 123 456");
  await user.type(screen.getByLabelText(/cover note/i), "I would love to join the BrightCore engineering team.");
}

describe("ApplicationForm", () => {
  beforeEach(() => {
    submitApplicationAction.mockReset();
  });

  it("shows every problem at once and does not submit an empty form", async () => {
    const user = userEvent.setup();
    render(<ApplicationForm jobId={JOB_ID} jobTitle="Backend Engineer" />);

    await user.click(screen.getByRole("button", { name: /submit application/i }));

    expect(await screen.findByText("Enter your full name")).toBeInTheDocument();
    expect(screen.getByText("Enter an email address")).toBeInTheDocument();
    expect(screen.getByText("Attach your CV as a PDF file")).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute("aria-invalid", "true");
    expect(submitApplicationAction).not.toHaveBeenCalled();
  });

  it("refuses non-PDF and oversized files before upload", async () => {
    // applyAccept: false lets the test pick files the browser dialog would hide.
    const user = userEvent.setup({ applyAccept: false });
    render(<ApplicationForm jobId={JOB_ID} jobTitle="Backend Engineer" />);
    const input = screen.getByLabelText(/^CV/);

    await user.upload(input, new File(["hello"], "notes.txt", { type: "text/plain" }));
    expect(screen.getByText("Upload your CV as a PDF file")).toBeInTheDocument();

    await user.upload(input, pdfFile("huge.pdf", 5 * 1024 * 1024 + 1));
    expect(screen.getByText("Your CV must be 5 MB or smaller")).toBeInTheDocument();
    expect(screen.queryByText("huge.pdf")).not.toBeInTheDocument();
  });

  it("shows the chosen file and lets the candidate replace or remove it", async () => {
    const user = userEvent.setup();
    render(<ApplicationForm jobId={JOB_ID} jobTitle="Backend Engineer" />);

    await user.upload(screen.getByLabelText(/^CV/), pdfFile("first.pdf"));
    expect(screen.getByText("first.pdf")).toBeInTheDocument();

    await user.upload(screen.getByLabelText(/^CV/), pdfFile("second.pdf"));
    expect(screen.getByText("second.pdf")).toBeInTheDocument();
    expect(screen.queryByText("first.pdf")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByText("second.pdf")).not.toBeInTheDocument();
  });

  it("submits the form data and shows a confirmation", async () => {
    submitApplicationAction.mockResolvedValue({ ok: true, reference: "BC-1234ABCD" });
    const user = userEvent.setup();
    render(<ApplicationForm jobId={JOB_ID} jobTitle="Backend Engineer" />);

    await fillDetails(user);
    await user.upload(screen.getByLabelText(/^CV/), pdfFile());
    await user.click(screen.getByRole("button", { name: /submit application/i }));

    expect(await screen.findByRole("heading", { name: "Application submitted" })).toBeInTheDocument();
    expect(screen.getByText("BC-1234ABCD")).toBeInTheDocument();

    const sent = submitApplicationAction.mock.calls[0][0] as FormData;
    expect(sent.get("jobId")).toBe(JOB_ID);
    expect(sent.get("email")).toBe("jane@example.com");
    expect((sent.get("cv") as File).name).toBe("cv.pdf");
  });

  it("shows server-side errors next to the right fields", async () => {
    submitApplicationAction.mockResolvedValue({
      ok: false,
      code: "DUPLICATE",
      message: "You have already applied for this job with this email address.",
    });
    const user = userEvent.setup();
    render(<ApplicationForm jobId={JOB_ID} jobTitle="Backend Engineer" />);

    await fillDetails(user);
    await user.upload(screen.getByLabelText(/^CV/), pdfFile());
    await user.click(screen.getByRole("button", { name: /submit application/i }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/already applied/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Application submitted" })).not.toBeInTheDocument();
  });
});
