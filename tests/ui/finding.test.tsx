// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { FindingRow } from '../../src/ui/components/Finding';
import type { Finding } from '../../src/core/models';

afterEach(cleanup);

const FINDING: Finding = {
  ruleId: 'KLYNTO-HDR-010',
  moduleId: 'headers',
  severity: 'review',
  status: 'fail',
  title: 'Content-Security-Policy is not present',
};

describe('FindingRow', () => {
  it('renders the title collapsed by default', () => {
    render(<FindingRow finding={FINDING} />);
    expect(screen.getByText('Content-Security-Policy is not present')).toBeTruthy();
    expect(screen.queryByText('Why it matters')).toBeNull();
  });

  it('expands to show explanation, impact and recommendation from the registry', () => {
    render(<FindingRow finding={FINDING} defaultOpen />);
    expect(screen.getByText('What this means')).toBeTruthy();
    expect(screen.getByText('Why it matters')).toBeTruthy();
    expect(screen.getByText('Recommended action')).toBeTruthy();
    expect(screen.getByText('Learn more')).toBeTruthy();
  });

  it('shows the Fix Center for rules with fix controls', () => {
    render(<FindingRow finding={FINDING} defaultOpen />);
    expect(screen.getByText('Fix Center')).toBeTruthy();
    expect(screen.getByText('Express / Node')).toBeTruthy();
    fireEvent.click(screen.getByText('NGINX'));
    expect(screen.getByText(/add_header Content-Security-Policy/)).toBeTruthy();
  });

  it('toggles on click', () => {
    render(<FindingRow finding={FINDING} />);
    fireEvent.click(screen.getByText('Content-Security-Policy is not present'));
    expect(screen.getByText('What this means')).toBeTruthy();
    fireEvent.click(screen.getByText('Content-Security-Policy is not present'));
    expect(screen.queryByText('What this means')).toBeNull();
  });
});
