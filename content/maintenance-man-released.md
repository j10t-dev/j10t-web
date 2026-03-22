---
title: maintenance-man is public!
date: 2026-03-22
draft: false
---

# maintenance-man is live

TL;DR - maintenance-man has been released on github - [https://github.com/j10t-dev/maintenance-man](https://github.com/j10t-dev/maintenance-man).

## Why does it exist

I felt the need to make maintenance-man due to a confluence of factors: 

* With the rise of LLM coding agents, I am actually building things in my own time. 
* I am a polyglottal dev - I like to use the best language and tool-chain for the job. 
* It is difficult to remember how a given project is built, tested and deployed when bouncing between projects (or not working on one for a while).
* The maintenance burden (and cognitive load) increases with each new project.
* I understand that things-exposed-to-the-internet need to be secure, with regular vulnerability scanning and dependency updates.
* Doing ^ manually, per indvidual project is tedious enough that I will avoid doing it (or just forget to do it.... or forget which projects need doing... or forget that time has passed and it needs redoing)^[yes, my memory is perhaps not the best...]

The solution? A configuration driven wrapper that lets me (or an LLM agent) think about the fundamental maintenance operations ('scan', 'update', 'test', 'build', 'deploy') without needing to remember the specific parlance for each project and lets me apply these en-masse to all my projects at once.

## My workflow

With the release of `mm`, my maintenance workflow has become simple: 

* `mm scan` -> trivy scans and reports vulnerability detections and updates (and other generic dependency updates).
* `mm update` -> For each project with findings, iteratively update dependencies and validate each one against the full unit/integration/component test-suite. 

This generates and publishes a `graphite` stack for human review and merging into `main`.^[I am still long term evaluating if graphite is the right solution here, as well as whether I really need a human review for the final merge] 

If an update fails, the branch is left intact for further investigation and rectification.

* `mm deploy --build` -> Deploys all^[eventually I'd like a version (or change detection) driven check to ensure deploys are not ran unnecessarily] configured applications, building their deploy artifacts if necessary^[e.g. I use bun-compiled executables for typescript, while python projects aren't compiled] and validates succesful deployments via the application's healthcheck. 


## Caveats / Why it works for me

This workflow and tooling works for me because I know that projects I produce will conform to some fundamental shared standards^[maybe one day I'll write a proper post on these...]: 
- heavy usage of TDD
- clean testing hierarchy
- expose a healthcheck endpoint
- provides a Dockerfile for integrating with my `healthchecker` service.

It is specifically written for myself, and as such only supports the languages and package-managers I am actively using.

## The future

For now I aim to just use the tool in my regular workflow, refining any edge-cases or annoyances I come across. While the project is public (and posting about it implies I want eyeballs on it...) I have no intention of making this a 'generally usable' tool. It is personal software that will remain tailored to my individual needs.
