#!/usr/bin/env bash
# Migration: machines provisioned before the theme engine need theme.kdl and the default theme applied.
set -euo pipefail
command -v bantu-os-theme >/dev/null || exit 0
bantu-os-theme set "$(bantu-os-theme current)"
