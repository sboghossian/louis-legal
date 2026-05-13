{{/*
Common helpers for the Louis chart.
*/}}

{{- define "louis.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "louis.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "louis.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "louis.labels" -}}
helm.sh/chart: {{ include "louis.chart" . }}
app.kubernetes.io/name: {{ include "louis.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: louis
{{- end -}}

{{- define "louis.selectorLabels" -}}
app.kubernetes.io/name: {{ include "louis.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "louis.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "louis.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{/*
Resolve a component's image as repo:tag, falling back to the chart-level
image when the component leaves it blank.
*/}}
{{- define "louis.componentImage" -}}
{{- $root := index . 0 -}}
{{- $component := index . 1 -}}
{{- $suffix := index . 2 -}}
{{- $repo := default (printf "%s-%s" $root.Values.image.repository $suffix) $component.image.repository -}}
{{- $tag := default $root.Values.image.tag $component.image.tag -}}
{{- printf "%s:%s" $repo $tag -}}
{{- end -}}

{{- define "louis.secretName" -}}
{{- if .Values.existingSecret -}}
{{- .Values.existingSecret -}}
{{- else -}}
{{- printf "%s-secrets" (include "louis.fullname" .) -}}
{{- end -}}
{{- end -}}

{{- define "louis.configMapName" -}}
{{- printf "%s-config" (include "louis.fullname" .) -}}
{{- end -}}
