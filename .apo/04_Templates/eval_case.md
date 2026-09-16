---
note_type: eval_case
template_version: 1
contract_version: 1
title: "<what this case guards>"
owner: ""
created: '<TODAY>'
updated: '<TODAY>'
tags: [apovault, eval_case]
case_id: "<kebab-case-id>"
suite: "<suite-dir-name>"
subject: "<registered-subject-id>"
input: {}
checks:
  - type: contains
    all_of: ["<expected substring>"]
    forbidden: []
---

# <what this case guards>

## Why

<One paragraph: the regression this case catches and why the expectations are what they are. The committed checks above ARE the baseline — change them only in a reviewed diff.>
