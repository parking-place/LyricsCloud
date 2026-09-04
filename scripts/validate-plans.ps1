$repoRootPath = Split-Path -Parent $PSScriptRoot
$devPlanPath = Join-Path $repoRootPath '0.Plans\1. Dev-phase'
$implementationStackPath = Join-Path $repoRootPath '0.Plans\Implementation-Stack.md'
$statusPath = Join-Path $devPlanPath 'STATUS.md'
$adrIndexPath = Join-Path $repoRootPath 'docs\adr\README.md'
$traceabilityPath = Join-Path $devPlanPath 'Requirements-Traceability.md'
$expectedVersions = @(
  '0.0.0',
  '0.1.0',
  '0.2.0',
  '0.3.0',
  '0.3.1',
  '0.4.0',
  '0.5.0',
  '0.6.0',
  '0.7.0',
  '0.8.0',
  '0.9.0',
  '0.9.1',
  '1.0.0'
)
$expectedRequirementCounts = @{
  'AUTH' = 5
  'SONG' = 11
  'LYRIC' = 17
  'RHYME' = 10
  'PROMPT' = 14
  'COMMON' = 14
}
$validationErrors = [System.Collections.Generic.List[string]]::new()
$allTaskIds = [System.Collections.Generic.List[string]]::new()
$phaseFiles = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
$discoveredPhaseFiles = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
$checkedDecisionIds = [System.Collections.Generic.List[string]]::new()
$currentVersion = $null
$currentPhase = $null
$adrDocIds = @()
$statusAdrIds = @()
$uniqueRequirementIds = @()

foreach ($versionName in $expectedVersions) {
  $versionPath = Join-Path $devPlanPath $versionName
  if (-not (Test-Path -LiteralPath $versionPath -PathType Container)) {
    $validationErrors.Add("Missing version directory: $versionName")
    continue
  }

  $expectedPhaseNames = @('1phase.md', '2phase.md', '3phase.md', '4phase.md', '5phase.md')
  $versionPhaseFiles = @(Get-ChildItem -LiteralPath $versionPath -File -Filter '*phase.md')
  foreach ($versionPhaseFile in $versionPhaseFiles) {
    $discoveredPhaseFiles.Add($versionPhaseFile)
    if ($versionPhaseFile.Name -notin $expectedPhaseNames) {
      $validationErrors.Add("Unexpected phase document: $versionName/$($versionPhaseFile.Name)")
    }
  }

  foreach ($phaseNumber in 1..5) {
    $phasePath = Join-Path $versionPath ("{0}phase.md" -f $phaseNumber)
    if (-not (Test-Path -LiteralPath $phasePath -PathType Leaf)) {
      $validationErrors.Add("Missing phase document: $versionName/$phaseNumber" + 'phase.md')
      continue
    }

    $phaseFile = Get-Item -LiteralPath $phasePath
    $phaseFiles.Add($phaseFile)
    $phaseContent = Get-Content -Raw -Encoding UTF8 -LiteralPath $phasePath

    $sectionHeadingMatches = [regex]::Matches($phaseContent, '(?m)^## [^\r\n]+$')
    if ($sectionHeadingMatches.Count -lt 10) {
      $validationErrors.Add("Fewer than ten level-two sections in $versionName/$phaseNumber" + "phase.md: $($sectionHeadingMatches.Count)")
    }
    $phaseTitlePattern = '(?m)^# ' + [regex]::Escape($versionName) + ' Phase ' + $phaseNumber + '(?:\s+|$)'
    if ($phaseContent -notmatch $phaseTitlePattern) {
      $validationErrors.Add("Missing phase title in $versionName/$phaseNumber" + 'phase.md')
    }

    $versionId = $versionName.Replace('.', '')
    $taskPattern = "LC-$versionId-P$phaseNumber-\d{2}"
    $taskMatches = [regex]::Matches($phaseContent, $taskPattern)
    $uniquePhaseTaskIds = @($taskMatches.Value | Sort-Object -Unique)
    if ($uniquePhaseTaskIds.Count -lt 6) {
      $validationErrors.Add("Fewer than six task IDs in $versionName/$phaseNumber" + "phase.md: $($uniquePhaseTaskIds.Count)")
    }
    foreach ($taskId in $uniquePhaseTaskIds) {
      $allTaskIds.Add($taskId)
    }
  }
}

$expectedPhaseFileCount = $expectedVersions.Count * 5
if ($discoveredPhaseFiles.Count -ne $expectedPhaseFileCount) {
  $validationErrors.Add("Expected exactly $expectedPhaseFileCount phase documents, found $($discoveredPhaseFiles.Count)")
}

$unexpectedVersionDirectories = Get-ChildItem -LiteralPath $devPlanPath -Directory | Where-Object {
  $_.Name -notin $expectedVersions
}
foreach ($unexpectedDirectory in $unexpectedVersionDirectories) {
  $validationErrors.Add("Unexpected version directory: $($unexpectedDirectory.Name)")
}

$duplicateTaskIds = $allTaskIds | Group-Object | Where-Object Count -gt 1
foreach ($duplicateTaskId in $duplicateTaskIds) {
  $validationErrors.Add("Duplicate task ID: $($duplicateTaskId.Name)")
}

if (-not (Test-Path -LiteralPath $implementationStackPath -PathType Leaf)) {
  $validationErrors.Add('Missing implementation decision document: 0.Plans/Implementation-Stack.md')
}
else {
  $implementationStackContent = Get-Content -Raw -Encoding UTF8 -LiteralPath $implementationStackPath
  $decisionOptionPattern = [regex]'(?im)^\s*-\s*\[(?<checked>[ xX])\]\s*`?(?<id>DEC-(?<decision>\d{2})-[A-Z])`?'
  $decisionOptionMatches = $decisionOptionPattern.Matches($implementationStackContent)

  foreach ($decisionNumber in 1..13) {
    $decisionNumberText = '{0:D2}' -f $decisionNumber
    $decisionOptions = @($decisionOptionMatches | Where-Object {
      $_.Groups['decision'].Value -eq $decisionNumberText
    })
    $checkedOptions = @($decisionOptions | Where-Object {
      $_.Groups['checked'].Value -match '^[xX]$'
    })

    if ($decisionOptions.Count -eq 0) {
      $validationErrors.Add("Missing decision options for DEC-$decisionNumberText")
    }
    if ($checkedOptions.Count -ne 1) {
      $validationErrors.Add("Expected exactly one checked option for DEC-$decisionNumberText, found $($checkedOptions.Count)")
    }
    else {
      $checkedDecisionIds.Add($checkedOptions[0].Groups['id'].Value)
    }
  }

  if ($implementationStackContent -notmatch '(?im)^\s*-\s*\[[xX]\]\s*`FINAL-APPROVAL`') {
    $validationErrors.Add('FINAL-APPROVAL is not checked in 0.Plans/Implementation-Stack.md')
  }
}

$statusContent = $null
if (-not (Test-Path -LiteralPath $statusPath -PathType Leaf)) {
  $validationErrors.Add('Missing status document: 0.Plans/1. Dev-phase/STATUS.md')
}
else {
  $statusContent = Get-Content -Raw -Encoding UTF8 -LiteralPath $statusPath
  $statusYamlMatch = [regex]::Match($statusContent, '(?ms)^```yaml\s*\r?\n(?<yaml>.*?)^```')
  if (-not $statusYamlMatch.Success) {
    $validationErrors.Add('Missing fenced YAML status block in STATUS.md')
  }
  else {
    $statusYamlContent = $statusYamlMatch.Groups['yaml'].Value
    $currentVersionMatches = [regex]::Matches(
      $statusYamlContent,
      '(?m)^\s*current_version:\s*"?(?<value>[0-9]+\.[0-9]+\.[0-9]+)"?\s*$'
    )
    $currentPhaseMatches = [regex]::Matches(
      $statusYamlContent,
      '(?m)^\s*current_phase:\s*"?(?<value>[1-5]phase\.md)"?\s*$'
    )

    if ($currentVersionMatches.Count -ne 1) {
      $validationErrors.Add("Expected one STATUS current_version entry, found $($currentVersionMatches.Count)")
    }
    else {
      $currentVersion = $currentVersionMatches[0].Groups['value'].Value
    }

    if ($currentPhaseMatches.Count -ne 1) {
      $validationErrors.Add("Expected one STATUS current_phase entry, found $($currentPhaseMatches.Count)")
    }
    else {
      $currentPhase = $currentPhaseMatches[0].Groups['value'].Value
    }

    if ($null -ne $currentVersion -and $currentVersion -notin $expectedVersions) {
      $validationErrors.Add("STATUS current_version is not in the roadmap: $currentVersion")
    }
    if ($null -ne $currentVersion -and $null -ne $currentPhase) {
      $currentPhasePath = Join-Path (Join-Path $devPlanPath $currentVersion) $currentPhase
      if (-not (Test-Path -LiteralPath $currentPhasePath -PathType Leaf)) {
        $validationErrors.Add("STATUS current phase file does not exist: $currentVersion/$currentPhase")
      }
    }
  }
}

if (-not (Test-Path -LiteralPath $adrIndexPath -PathType Leaf)) {
  $validationErrors.Add('Missing ADR index: docs/adr/README.md')
}
elseif ($null -ne $statusContent) {
  $adrIndexContent = Get-Content -Raw -Encoding UTF8 -LiteralPath $adrIndexPath
  $adrDocIds = @(
    [regex]::Matches($adrIndexContent, 'ADR-\d{4}') |
      ForEach-Object { $_.Value } |
      Sort-Object -Unique
  )
  $statusAdrIds = @(
    [regex]::Matches($statusContent, 'ADR-\d{4}') |
      ForEach-Object { $_.Value } |
      Sort-Object -Unique
  )

  if ($adrDocIds.Count -eq 0) {
    $validationErrors.Add('No ADR IDs found in docs/adr/README.md')
  }
  if ($statusAdrIds.Count -eq 0) {
    $validationErrors.Add('No ADR IDs found in STATUS.md')
  }
  if ($adrDocIds.Count -gt 0 -and $statusAdrIds.Count -gt 0) {
    $adrDifferences = @(Compare-Object -ReferenceObject $adrDocIds -DifferenceObject $statusAdrIds)
    foreach ($adrDifference in $adrDifferences) {
      if ($adrDifference.SideIndicator -eq '<=') {
        $validationErrors.Add("ADR ID missing from STATUS.md: $($adrDifference.InputObject)")
      }
      else {
        $validationErrors.Add("ADR ID missing from docs/adr/README.md: $($adrDifference.InputObject)")
      }
    }
  }
}

if (-not (Test-Path -LiteralPath $traceabilityPath -PathType Leaf)) {
  $validationErrors.Add('Missing traceability document: 0.Plans/1. Dev-phase/Requirements-Traceability.md')
}
else {
  $traceabilityContent = Get-Content -Raw -Encoding UTF8 -LiteralPath $traceabilityPath
  $requirementRowMatches = [regex]::Matches(
    $traceabilityContent,
    '(?m)^\s*\|(?<firstCell>[^|\r\n]*\bREQ-[A-Z][A-Z0-9]*-\d{3}\b[^|\r\n]*)\|'
  )
  $requirementIds = [System.Collections.Generic.List[string]]::new()
  foreach ($requirementRowMatch in $requirementRowMatches) {
    $idsInFirstCell = [regex]::Matches(
      $requirementRowMatch.Groups['firstCell'].Value,
      'REQ-[A-Z][A-Z0-9]*-\d{3}'
    )
    if ($idsInFirstCell.Count -ne 1) {
      $validationErrors.Add('Each requirement matrix row must define exactly one requirement ID in its first cell')
      continue
    }
    $requirementIds.Add($idsInFirstCell[0].Value)
  }

  $duplicateRequirementIds = $requirementIds | Group-Object | Where-Object Count -gt 1
  foreach ($duplicateRequirementId in $duplicateRequirementIds) {
    $validationErrors.Add("Duplicate requirement ID: $($duplicateRequirementId.Name)")
  }
  $uniqueRequirementIds = @($requirementIds | Sort-Object -Unique)
  if ($uniqueRequirementIds.Count -lt 71) {
    $validationErrors.Add("Fewer than 71 unique requirement IDs in Requirements-Traceability.md: $($uniqueRequirementIds.Count)")
  }
  foreach ($requirementCategory in $expectedRequirementCounts.Keys) {
    $categoryRequirementCount = @(
      $uniqueRequirementIds | Where-Object { $_ -match "^REQ-$requirementCategory-\d{3}$" }
    ).Count
    if ($categoryRequirementCount -ne $expectedRequirementCounts[$requirementCategory]) {
      $validationErrors.Add(
        "Expected $($expectedRequirementCounts[$requirementCategory]) REQ-$requirementCategory IDs, found $categoryRequirementCount"
      )
    }
  }
}

$markdownFiles = Get-ChildItem -LiteralPath $repoRootPath -Recurse -File -Filter '*.md' | Where-Object {
  $_.FullName -notmatch '[\\/]node_modules[\\/]'
}
$markdownLinkPattern = [regex]'!?\[[^\]]*\]\((?<target>[^)]+)\)'

foreach ($markdownFile in $markdownFiles) {
  $markdownContent = Get-Content -Raw -Encoding UTF8 -LiteralPath $markdownFile.FullName
  foreach ($linkMatch in $markdownLinkPattern.Matches($markdownContent)) {
    $rawTarget = $linkMatch.Groups['target'].Value.Trim()
    if ($rawTarget.StartsWith('<') -and $rawTarget.EndsWith('>')) {
      $rawTarget = $rawTarget.Substring(1, $rawTarget.Length - 2)
    }
    if ($rawTarget -match '^[a-zA-Z][a-zA-Z0-9+.-]*:' -or $rawTarget.StartsWith('#')) {
      continue
    }

    $pathTarget = $rawTarget.Split('#')[0]
    if ([string]::IsNullOrWhiteSpace($pathTarget)) {
      continue
    }
    $pathTarget = [System.Uri]::UnescapeDataString($pathTarget)
    $resolvedCandidate = Join-Path $markdownFile.DirectoryName $pathTarget
    if (-not (Test-Path -LiteralPath $resolvedCandidate)) {
      $relativeFile = $markdownFile.FullName.Substring($repoRootPath.Length).TrimStart('\', '/')
      $validationErrors.Add("Broken local link in ${relativeFile}: $rawTarget")
    }
  }
}

if ($validationErrors.Count -gt 0) {
  Write-Output "Plan validation failed with $($validationErrors.Count) error(s):"
  foreach ($validationError in $validationErrors) {
    Write-Output "- $validationError"
  }
  exit 1
}

Write-Output "Plan validation passed."
Write-Output "Versions: $($expectedVersions.Count)"
Write-Output "Phase documents: $($phaseFiles.Count)"
Write-Output "Unique task IDs: $($allTaskIds.Count)"
Write-Output "Checked decisions: $($checkedDecisionIds.Count)"
if ($null -ne $currentVersion -and $null -ne $currentPhase) {
  Write-Output "Current phase: $currentVersion/$currentPhase"
}
Write-Output "ADR IDs compared: $($adrDocIds.Count)"
if (Test-Path -LiteralPath $traceabilityPath -PathType Leaf) {
  Write-Output "Unique requirement IDs: $($uniqueRequirementIds.Count)"
}
Write-Output "Markdown files checked: $($markdownFiles.Count)"
