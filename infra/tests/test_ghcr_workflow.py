"""Static publication-policy checks; no workflow execution, registry or Docker writes."""
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]


class GhcrWorkflowPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = (ROOT / ".github/workflows/verify.yml").read_text(encoding="utf-8")
        publication = re.search(
            r"(?ms)^  publish-images:\n(.*?)(?=^  [a-zA-Z][\w-]*:\n|\Z)",
            cls.workflow,
        )
        if publication is None:
            raise AssertionError("The GHCR publication job must remain defined.")
        cls.publication = publication.group(1)

    def test_keeps_automatic_verification_and_manual_trigger(self):
        events = re.search(r"(?ms)^on:\n(.*?)(?=^\S)", self.workflow)
        self.assertIsNotNone(events)
        self.assertEqual(
            set(re.findall(r"(?m)^  ([\w_]+):[ \t]*$", events.group(1))),
            {"push", "pull_request", "workflow_dispatch"},
        )

    def test_publication_requires_manual_run_on_master(self):
        condition = re.search(r"(?m)^    if: (.+)$", self.publication)
        self.assertIsNotNone(condition)
        self.assertEqual(
            condition.group(1).strip(),
            "github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/master'",
        )

    def test_publication_still_requires_all_verifications(self):
        dependencies = re.search(r"(?m)^    needs: \[([^\]]+)\]$", self.publication)
        self.assertIsNotNone(dependencies)
        self.assertEqual(
            {job.strip() for job in dependencies.group(1).split(",")},
            {"frontend", "postgresql", "https-rehearsal"},
        )


if __name__ == "__main__":
    unittest.main()
