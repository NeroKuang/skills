const SECRET_KEY_PATTERN =
  /(api[_-]?key|token|secret|password|passwd|private[_-]?key|credential|authorization)/i;

const SECRET_VALUE_PATTERN =
  /\b(sk-[a-zA-Z0-9]{16,}|ghp_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,}|xox[baprs]-[a-zA-Z0-9-]{10,}|AKIA[0-9A-Z]{16})\b/;

export function findSecretViolations(value, path = '') {
  const findings = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...findSecretViolations(item, `${path}[${index}]`));
    });
    return findings;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (SECRET_KEY_PATTERN.test(key) && typeof child === 'string' && child.trim()) {
        findings.push({
          path: nextPath,
          reason: `suspicious secret-bearing key "${key}"`,
        });
      }
      findings.push(...findSecretViolations(child, nextPath));
    }
    return findings;
  }

  if (typeof value === 'string' && SECRET_VALUE_PATTERN.test(value)) {
    findings.push({
      path: path || '<root>',
      reason: 'value matches known secret pattern',
    });
  }

  return findings;
}
