// transactional email bodies — the same restraint as the screens.
// Dark ground, chalk text, one gold line. No logo bar, no footer marketing.
import { copy, fill } from "./copy";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function approvalEmail(memberNumber: string, welcomeUrl: string) {
  const subject = fill(copy.email.approval.subject, { memberNumber });
  const lines = copy.email.approval.lines.map((l) => fill(l, { memberNumber }));
  const text = [...lines, welcomeUrl, "", copy.email.approval.unsubscribe].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0a0708;">
    <div style="max-width:480px;margin:0 auto;padding:96px 32px;background:#0a0708;
                font-family:'Courier New',Courier,monospace;color:#e8e2d6;text-align:center;">
      <p style="margin:0 0 40px;font-size:22px;letter-spacing:0.08em;">${esc(lines[0] ?? "")}</p>
      <p style="margin:0 0 40px;font-size:16px;letter-spacing:0.08em;">${esc(lines[1] ?? "")}</p>
      <p style="margin:0 0 56px;font-size:14px;letter-spacing:0.35em;color:#b08d4f;">${esc(
        lines[2] ?? "",
      )}</p>
      <p style="margin:0 0 96px;">
        <a href="${esc(welcomeUrl)}"
           style="color:#e8e2d6;font-size:15px;letter-spacing:0.15em;text-decoration:underline;">
          ${esc(copy.email.approval.action)}
        </a>
      </p>
      <p style="margin:0;font-size:10px;letter-spacing:0.1em;color:rgba(232,226,214,0.35);">
        <a href="${esc(welcomeUrl.split("/welcome")[0] ?? "")}/unsubscribe"
           style="color:rgba(232,226,214,0.35);text-decoration:underline;">${esc(
             copy.email.approval.unsubscribe,
           )}</a>
      </p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}
