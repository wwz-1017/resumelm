const exportStyles = `
  body {
    margin: 0;
    color: #1e2722;
    background: #ffffff;
    font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  .resume-paper {
    width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    padding: 48px;
    border: 0;
    background: #fffefb;
    box-sizing: border-box;
  }
  .template-compact {
    padding: 36px 44px;
  }
  .template-project {
    border-top: 8px solid #e2b857;
  }
  .resume-head {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 18px;
    border-bottom: 3px solid #314934;
  }
  .template-project .resume-head {
    border-bottom-color: #e2b857;
  }
  .template-compact .resume-head {
    border-bottom-width: 1px;
  }
  .resume-head h2 {
    margin: 0;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 38px;
  }
  .resume-head p,
  .muted {
    color: #657269;
  }
  .resume-target {
    align-self: flex-end;
    color: #314934;
    font-weight: 800;
  }
  .resume-section {
    margin-top: 24px;
  }
  .resume-section h3 {
    margin: 0 0 10px;
    color: #314934;
    font-size: 15px;
    letter-spacing: 0.08em;
  }
  .template-project .resume-section h3 {
    color: #8a6231;
  }
  .resume-section p {
    margin: 0;
    line-height: 1.72;
  }
  .resume-row {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 8px;
  }
  .resume-item + .resume-item {
    margin-top: 16px;
  }
  .skill-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .skill-list span {
    padding: 6px 9px;
    border: 1px solid #dfe4d8;
    border-radius: 999px;
    background: #f8faf5;
  }
  .template-compact .skill-list span {
    border-radius: 6px;
    background: transparent;
  }
  .resume-list {
    margin: 0;
    padding-left: 18px;
    line-height: 1.7;
  }
  @page {
    margin: 0;
    size: A4;
  }
`;

const getFileBaseName = (name: string) => {
  const normalizedName = name.trim().replace(/[\\/:*?"<>|]/g, "-");
  return normalizedName ? `ResumeLM-${normalizedName}` : "ResumeLM-resume";
};

const buildExportDocument = (resumeHtml: string) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${getExportStyles()}</style>
  </head>
  <body>${resumeHtml}</body>
</html>`;

const getExportStyles = () => {
  const runtimeStyles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .join("\n");

  return `${exportStyles}\n${runtimeStyles}`;
};

const getResumePreviewHtml = () => {
  const resumePaper = document.querySelector<HTMLElement>(".resume-paper");
  if (!resumePaper) {
    throw new Error("Resume preview is not available");
  }

  const exportPaper = resumePaper.cloneNode(true) as HTMLElement;
  exportPaper.querySelectorAll(".resume-edit-controls, .resume-hidden-placeholder").forEach((node) => node.remove());
  exportPaper.querySelectorAll(".resume-module-frame").forEach((frame) => {
    frame.replaceWith(...Array.from(frame.childNodes));
  });

  return exportPaper.outerHTML;
};

export const downloadResumeWord = (name: string) => {
  const html = buildExportDocument(getResumePreviewHtml());
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${getFileBaseName(name)}.doc`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const printResumePdf = (name: string) => {
  const printWindow = window.open("", "_blank", "width=900,height=1100");

  if (!printWindow) {
    throw new Error("Print window blocked");
  }

  printWindow.document.write(buildExportDocument(getResumePreviewHtml()));
  printWindow.document.title = `${getFileBaseName(name)}.pdf`;
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
