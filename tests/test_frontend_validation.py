from pathlib import Path


def test_dashboard_upload_form_requires_all_documents() -> None:
    content = Path("dashboard/src/pages/Dashboard.tsx").read_text()
    assert "disabled={disabled || !isComplete}" in content
    assert "requirements.map" in content


def test_multistep_form_disables_incomplete_steps() -> None:
    content = Path("dashboard/src/pages/MultiStepForm.tsx").read_text()
    assert "disabled={!requirementsLoaded || !offerComplete}" in content
    assert "disabled={!requirementsLoaded || !applicationComplete}" in content
    assert "disabled={!requirementsLoaded || !accountComplete}" in content
