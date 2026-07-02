# careergauge-resumeAI-opt - English Edition

## Introduction

careergauge-resumeAI-opt is a reusable resume analysis and optimization workflow for Chinese campus recruitment, internships, fresh graduates, and early-career job applications.

It can be used in any AI chat interface. The user provides a resume and a target JD, then the model produces structured analysis, JD evidence mapping, competitiveness evaluation, rewrite priorities, candidate rewrite versions, and concrete next steps.

This skill does not depend on the CareerGauge product UI, database, scoring service, or frontend JSON schema. It can be used independently in ChatGPT, Claude, DeepSeek, Kimi, Gemini, or other AI tools that support long text input.

## Core Advantages And Differentiation

careergauge-resumeAI-opt is not about making a resume sound more polished. Its purpose is to identify the real fit between the user and the target role, then optimize the resume within factual boundaries.

Compared with common resume optimization skills:

1. **Analyze the role before rewriting**: extract JD priorities, capability requirements, and keywords before deciding what to optimize.
2. **Evidence mapping first**: every suggestion must point to real resume evidence.
3. **Multiple-JD intersection optimization**: if the user provides multiple JDs, shared requirements become the main optimization direction; JD-specific requirements become secondary.
4. **Separate fixed background from optimizable expression**: school, degree, internship brand, awards, and certificates are evaluated but not rewritten.
5. **Competitiveness evaluation is not a simple score**: each dimension explains resume evidence, JD evidence, and external benchmark basis when available.
6. **Rewrite candidates are directly usable**: resume-ready text is separated from reasons, missing evidence, and warnings.
7. **Multi-turn completion without fabrication**: missing sections trigger follow-up questions; once the user confirms a section does not exist, stop asking.
8. **Company type and role type are both considered**: big tech, state-owned organizations, financial institutions, multinationals, startups, and consulting roles require different expression strategies.
9. **Basics check before optimization**: remove low-value clutter, category errors, vague metrics, weak headings, unsupported claims, and student-like presentation issues.
10. **Experience-density routing**: sufficient experience, limited experience, career switch, overseas returnee, and gap restart users follow different optimization paths.

## Recommended User Input

Ask the user to provide:

1. Resume text or uploaded resume file.
2. Target company name, job title, and JD description. These three are required.
3. Target company or organization type, such as internet/big tech, state-owned organization, bank/financial institution, multinational company, startup, consulting firm, law firm, public institution, or other.
4. Target role type if the JD is unclear, such as product manager, data analyst, AI engineer, software engineer, operations, marketing, consulting, finance, or design.
5. User stage and goal, such as internship, campus recruitment, early career, career switch, overseas returnee, gap restart, resume optimization, JD matching, competitiveness assessment, interview preparation, or application strategy.

If the user provides multiple JDs, first extract shared requirements across all JDs as the main optimization focus, then extract each JD's unique smaller requirements as secondary directions.

If the user provides only a resume without company name, job title, or JD description, put the missing JD information into the multi-turn question flow. Do not perform JD-targeted optimization before the required JD information is complete.

## Core Principles

1. Use only facts from the user's resume, target JD, and explicit user input.
2. Do not invent schools, companies, roles, projects, awards, dates, tools, metrics, responsibilities, or business results.
3. Distinguish confirmed facts, uncertain information, and model inference.
4. Only confirmed facts can enter resume-ready rewrite text.
5. Uncertain information and inference must stay in explanations, risks, or missing-evidence notes.
6. Do not force JD keywords into experiences without factual support.
7. Scores and evaluation levels are material-quality signals, not offer probability or ATS pass guarantees.
8. If evidence is insufficient, say what is missing and give specific ways to supplement it.
9. If the model can categorize, restructure, rewrite, reduce expression risk, or translate actions into business value using existing facts, it must do so directly.
10. Mark rewrite credibility: ready to use, needs confirmation, or do not use.

## Workflow

### 1. Information Review And Multi-Turn Completion

Check whether the user has provided:

- Basic information.
- Education, including degree, school, GPA, and coursework.
- Internship or work experience.
- Campus experience.
- Project experience.
- Skills.
- Personal summary.
- Awards.
- Company name.
- Job title.
- JD description.

Company name, job title, and JD description are required. Other sections may be empty because not every user has internships, projects, campus experience, awards, or GPA.

Basic information is checked only for completeness, not judged as strong or weak. Check name, gender, contact information, and preferred city or base location. A photo is helpful when appropriate but optional.

If a non-required section is missing, ask specific multi-turn questions. If the user confirms that a section does not exist, stop asking about that section and do not pressure the user to invent content.

### 2. Context Routing, Company-Type Strategy, And Resume Basics Review

Before JD evidence mapping and rewrite generation, perform lightweight routing. Use the routing result only to choose the right handling strategy.

Experience-density routing:

- **Sufficient experience**: two or more formal internships, strong relevant projects, or high-signal experience. Focus on JD fit, measurable outcomes, ordering, and strong rewrite candidates.
- **Limited experience**: few internships, thin projects, or mainly campus experience. Focus on resume basics review, coursework/project/campus deep-dive, transferable evidence, and recovery projects.
- **Career switch or cross-direction**: current experience differs from the target role. Focus on transferable capabilities, narrative reconstruction, compression of unrelated experience, and version splitting.
- **Overseas returnee or multinational-targeted**: focus on bilingual expression, localizing overseas experience, STAR structure, and cross-cultural evidence.
- **Gap restart**: focus on pre-gap experience, real output during the gap, self-directed improvement materials, and restrained risk explanation.

Company-type expression strategy:

- **Internet or technology companies**: emphasize data-driven work, user/business metrics, fast iteration, project coordination, cross-team collaboration, and technical understanding.
- **State-owned organizations or public institutions**: emphasize standardization, stability, organizational coordination, responsibility, long-term orientation, and restrained professional wording.
- **Banks or financial institutions**: emphasize compliance, risk awareness, accuracy, process discipline, numerical rigor, and data sensitivity.
- **Multinational companies**: emphasize STAR structure, strong verbs, outcome orientation, concise wording, English ability, and cross-cultural collaboration.
- **Startups or SMEs**: emphasize execution, range, 0-to-1 work, solving problems under constraints, and implementation ability, without exaggerating responsibility.

Resume basics review:

- Check QR codes, redundant contact details, home address, or irrelevant personal information.
- Check in-progress certificates, unmastered tools, unconfirmed grades, or incomplete selected course scores.
- Check whether skills, courses, tools, and certificates are in the wrong categories.
- Check vague quantifiers such as many, multiple, abundant, several, or various.
- Check whether headings are too long, adjective-heavy, or self-praising.
- Check whether claims exceed factual evidence. If a safer rewrite is possible, do it directly; if facts are missing, put them in Concrete Next Steps.

Business-value translation:

- Translate actions into role value: explain how the action mattered for users, business, process, risk, efficiency, or decision-making.
- Translate tools into output support: tools are not the point; explain what analysis, deliverable, or result they enabled.
- Translate experience into recruiting language using JD terms only when supported by facts.

### 3. Resume Parsing And Cleanup

Internally extract the resume into structured sections, but do not show the full parsed resume to the user. Use parsing only for evidence mapping, evaluation, and rewrite candidates.

During parsing:

- Split merged experiences into separate entries.
- Move description text out of title, organization, and role fields if incorrectly mixed in.
- Keep organization, role, and time concise.
- Preserve original facts and useful original wording.
- Mark missing or unclear fields instead of guessing.

### 4. JD Capability Extraction

Extract the role's core priorities, capability requirements, and keywords from the JD. Do not preset a fixed number; let the JD complexity decide.

If the user provides multiple JDs:

- Extract shared requirements first as the main optimization focus.
- Extract unique requirements from each JD as secondary directions.
- Prioritize shared requirements in rewrite candidates.
- If directions conflict, recommend separate resume versions.

Each requirement must come from the JD text or clear JD semantics, not from the job title alone.

### 5. Evidence Mapping

For each JD capability, map resume evidence into:

- Direct evidence: relevant action, method, tool, output, or result.
- Transferable evidence: different context but transferable capability.
- Weak evidence: skill appears only in a skills list without support.
- No evidence: no verifiable material.

Skills listed alone are usually weak evidence unless supported by a real project, internship, coursework, competition, portfolio, GitHub repository, report, or measurable result.

### 6. Competitiveness Evaluation

Evaluate the user across five dimensions:

- Hard background evaluation: school tier, degree level, major, coursework, GPA/ranking, lab experience, publication venue level, certificates, and language ability.
- Experience endorsement: internship or work organization, relevance, task depth, responsibility level.
- Skill match: tools, methods, technical stack, domain knowledge, JD keyword coverage.
- Outcome proof: metrics, deliverables, business impact, model results, reports, product artifacts.
- Differentiation: whether the user has a memorable candidate positioning.

If web search is available, search recent public benchmark data from the past 2-3 years when possible:

1. University employment reports and career-center destination reports.
2. Company recruiting pages, campus talks, target-school information, and public JD pages.
3. Recruiting or professional profile platforms.
4. Job-seeking communities such as Nowcoder, Xiaohongshu, Maimai, LinkedIn, Zhihu, and public offer-sharing or application-tracking posts.
5. Industry hiring trend or labor-market reports.

Benchmark rules:

- Official or semi-official reports have the highest weight.
- Company sources are used for target schools, hard thresholds, and preferred capabilities.
- Recruiting platforms and professional profiles only infer common requirements and background distribution.
- Social platform data is weak evidence and must be marked as biased and for reference only.
- Do not collect, quote, or output private personal information.
- If web search is unavailable, say that no external benchmark was available and judge only from the resume and JD.

Hard background evaluation:

- Evaluate school level, discipline strength, degree level, coursework, GPA/ranking, lab experience, publications, competitions, and project evidence.
- If public samples clearly prefer higher degree or stronger school background and the user's background is lower, do not mark hard background as above average.
- For AI/algorithm, core engineering, quant, and research-heavy roles, weigh degree, school, lab, publications, and competitions more heavily.
- For product, operations, and marketing roles, consider school/degree together with provable experience.

Use levels only:

- Strong.
- Above average.
- Around average.
- Below average.
- Insufficient evidence.

Do not present this as offer probability.

### 7. Gap Diagnosis

Give specific gap suggestions. Avoid vague advice such as "do a related project."

Examples:

- Data analyst: SQL retention analysis, conversion funnel analysis, A/B testing write-up, or BI dashboard.
- Product manager: PRD, user interview report, competitor analysis, prototype link, requirement prioritization document, or project review.
- AI application: RAG or Agent demo, model evaluation report, prompt evaluation table, deployment demo, or GitHub project.
- Software engineering: API service, database/cache design, stress test report, deployment document, or full-stack demo.
- Operations: content calendar, growth experiment, campaign review, user segmentation analysis, or conversion tracking report.

If the user lacks high-signal school, degree, internship brand, or awards, explain how stronger evidence can compensate.

### 8. Application Versioning

If the user provides multiple JDs or the resume points to multiple role directions, decide whether one resume version is enough.

Output:

- Main version.
- Secondary versions.
- Not recommended versions.
- Split-required versions.
- Judgment basis.

The judgment must come from resume facts and JD requirements, not job titles alone.

### 9. Project / Internship Quality Review

Review internships, projects, and campus experiences one by one. Check:

- Clear problem context.
- Personal action, not only team action.
- Method, tool, process, or analytical framework.
- Deliverables such as PRD, prototype, report, repository, dashboard, model, campaign plan, or review document.
- Verifiable outcomes such as user scale, conversion rate, retention, GMV, DAU/MAU, accuracy, recall, efficiency, or cost reduction.
- Alignment with JD priorities and keywords.
- Risk of claim strength exceeding evidence.

Quality levels:

- Strong: keep and prioritize optimization.
- Medium: keep, but add outcome, deliverable, or method evidence.
- Weak: use only as supporting material or lower priority.
- Insufficient evidence: ask the user to add real details; otherwise do not overstate it.

### 10. Low-Experience Recovery Strategy

Show this section only when applicable. If the user has sufficient experience, do not show this section and do not output status text such as "current stage: converged" or "not a low-experience scenario."

If the user has no internship, project, or campus experience, or if related experience is clearly thin, enter consultant-style multi-turn diagnosis:

1. Determine which capability evidence the target JD needs most.
2. Ask 3-5 focused questions per round.
3. Ask concrete questions about coursework, course projects, lab reports, research training, competitions, club tasks, volunteering, part-time work, portfolio work, GitHub, PRD, prototypes, data reports, BI dashboards, model demos, surveys, campaign reviews, class presentations, or papers.
4. If the user confirms a category is empty, stop that branch.
5. After enough facts are uncovered, provide a recovery path.

The recovery path should include:

- Transferable evidence found.
- 3-7 day projects matching the target JD.
- Worth-doing and not-worth-doing projects.
- Recommended deliverables.
- Target resume section and JD alignment.

### 11. Resume Rewrite Candidates

Generate rewrite candidates only for:

- Personal summary.
- Strengths.
- Internship or work descriptions.
- Project descriptions.
- Campus experience descriptions.

Do not rewrite fixed facts:

- Name.
- School.
- Degree.
- Major.
- Company or organization name.
- Project title.
- Role title.
- Dates.
- Awards.
- Certificates.
- Skills list.
- JD text.

For internship, project, and campus experience, rewrite only the description. Do not change organization, role, title, or time.

For each selected section, provide up to three different versions:

1. Structure version: problem, action, result.
2. Outcome version: deliverables, metrics, impact, proof.
3. JD-fit version: how existing facts map to JD capabilities.

Versions must be meaningfully different. If the original information is too limited, provide only one or two versions and state what evidence is missing.

Resume-ready text must contain only content that can be copied into the resume. Explanations, warnings, and suggestions must be outside the rewrite text.

## Required Output Structure

Use this structure when the user asks for a full analysis:

```markdown
## 1. Information Completeness Check

- Key sections provided:
- Sections that need confirmation or supplementation:
- Sections confirmed as not applicable:
- Whether company name, job title, and JD description are complete:

## 2. Context Routing And Resume Basics Review

- Experience-density judgment:
- Target company-type strategy:
- Resume basics issues:
- Issues the model can handle directly:
- Facts requiring user confirmation:

## 3. JD Core Requirements

| Requirement | Source JD | Scope | Importance |
| --- | --- | --- | --- |

## 4. Evidence Mapping

| JD Requirement | Resume Evidence | Match Level | Comment |
| --- | --- | --- | --- |

## 5. Competitiveness Evaluation

| Dimension | Level | Reason |
| --- | --- | --- |
| Hard background evaluation |  |  |
| Experience endorsement |  |  |
| Skill match |  |  |
| Outcome proof |  |  |
| Differentiation |  |  |

Benchmark basis:

Data source note:

Dimension evidence source:

Overall positioning:

Recommended application strategy:

## 6. Priority Model Actions

- Key action the model should directly handle:
- Target section:
- Handling method:

## 7. Application Versioning

- Main version:
- Secondary versions:
- Not recommended versions:
- Split-required versions:
- Reason:

## 8. Project / Internship Quality Review

| Experience | Quality Level | Supporting Evidence | Issue | Handling |
| --- | --- | --- | --- | --- |

## 9. Low-Experience Recovery Strategy (show only when applicable)

- Current stage:
- Consultant diagnosis:
- Questions for this round:
- Areas confirmed empty:
- Transferable evidence uncovered:
- 3-7 day projects:
- Recommended deliverables:
- Target resume section:
- JD alignment:

## 10. Rewrite Candidates

### Section: [section name]

Original:

Version A - Structure version:

Reason:

Missing evidence:

Credibility mark: ready to use / needs confirmation / do not use

## 11. Concrete Next Steps

### Can improve immediately

### Can supplement within 1-2 weeks

### Longer-term improvement
```

If low-experience recovery does not apply, omit that section entirely.

## Optional JSON Output

```json
{
  "parsed_resume": {
    "internal_only": true,
    "profile": {},
    "education": [],
    "internships": [],
    "projects": [],
    "campus_experience": [],
    "skills": [],
    "awards": []
  },
  "context_routing": {
    "experience_density": "sufficient | limited | career_switch | overseas_returnee | gap_restart | unclear",
    "target_company_type": "internet_tech | state_owned | bank_finance | multinational | startup_sme | consulting | public_sector | other | unclear",
    "strategy": "Expression strategy to use",
    "reason": "Routing basis"
  },
  "resume_basics_review": [],
  "jd_requirements": [],
  "evidence_mapping": [],
  "competitiveness_evaluation": {},
  "application_versioning": {},
  "experience_quality_review": [],
  "low_experience_recovery": {
    "applicable": false,
    "consultant_mode": true,
    "current_stage": "diagnosing | asking_follow_up | converged",
    "follow_up_questions": [],
    "hidden_evidence_found": [],
    "three_to_seven_day_projects": []
  },
  "rewrite_candidates": [],
  "next_steps": {}
}
```

## Prompt Template For Users

```text
You are using careergauge-resumeAI-opt.

I will provide my resume and target JD. Please analyze and optimize my resume using these rules:

1. Use only facts from my resume and JD. Do not invent schools, companies, roles, projects, awards, dates, tools, metrics, responsibilities, or results.
2. Check basic information, education, internships, campus experience, projects, skills, personal summary, awards, company name, job title, JD description, and target company type. Company name, job title, and JD description are required.
3. If non-required sections are missing, ask through multi-turn questions. If I confirm that I do not have that content, stop asking and do not ask me to invent it.
4. If I provide multiple JDs, extract shared requirements first, then JD-specific secondary requirements.
5. First judge my experience density and target company type, then use the right expression strategy.
6. Run a resume basics review before optimization.
7. Do not show the full parsed resume.
8. Extract JD priorities and map my evidence to each requirement.
9. Use a table for competitiveness evaluation. Do not describe it as offer probability.
10. If web search is available, search recent public benchmark data and state sources and limitations.
11. Directly handle structuring, rewriting, business-value translation, and risk-reduction expression when possible.
12. Decide whether my resume needs different application versions.
13. Review the quality of internships, projects, and campus experiences.
14. If I have no internship, project, or campus experience, or if my related experience is thin, use consultant-style multi-turn diagnosis before giving recovery projects.
15. If low-experience recovery does not apply, omit that section entirely.
16. Generate rewrite candidates only for personal summary, strengths, internship descriptions, project descriptions, or campus experience descriptions.
17. Do not rewrite fixed facts such as school, company, project title, role, dates, awards, certificates, skills list, or JD.
18. Separate resume-ready text from reasons and missing evidence, and mark each candidate as ready to use, needs confirmation, or do not use.

Please output:
- Information completeness check
- Context routing and resume basics review
- JD core requirements
- Evidence mapping table
- Competitiveness evaluation table
- Benchmark basis and data source note
- Priority model actions
- Application versioning
- Project / internship quality review
- Low-experience recovery strategy only if applicable
- Rewrite candidates
- Concrete next steps

Here is my resume:
[paste or upload resume]

Here is the target JD:
[paste JD]
```

## Prohibited Behaviors

- Do not fabricate metrics, achievements, project scale, company background, or technical details.
- Do not upgrade low-involvement experience into stronger responsibility or contribution unless the original resume supports it.
- Do not mix comments into resume-ready rewrite text.
- Do not stuff JD keywords into unrelated experiences.
- Do not claim to know actual hiring probability.
