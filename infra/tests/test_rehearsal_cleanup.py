"""Exercise the workflow cleanup with a stub; never run Docker or release.py."""
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import textwrap
import unittest


ROOT = Path(__file__).resolve().parents[2]


class RehearsalCleanupTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        workflow = (ROOT / ".github/workflows/verify.yml").read_text(encoding="utf-8")
        cleanup = re.search(
            r"(?m)^      - name: Clean up local rehearsal\n"
            r"        if: always\(\)\n"
            r"        shell: bash\n"
            r"        run: \|\n"
            r"((?:          .*\n)+)",
            workflow,
        )
        if cleanup is None:
            raise AssertionError("The rehearsal cleanup must retain its always() guard and Bash script.")
        cls.script = textwrap.dedent(cleanup.group(1))
        cls.bash = (
            str(Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Git/bin/bash.exe")
            if os.name == "nt" else shutil.which("bash")
        )
        if not cls.bash or not Path(cls.bash).is_file():
            raise unittest.SkipTest("Bash is required to check the workflow cleanup.")

    def run_cleanup(self, *, prepared, exit_code=0):
        with tempfile.TemporaryDirectory(prefix="exploralab-cleanup-test-") as directory:
            if prepared:
                settings = Path(directory) / "infra/.local/release.env"
                settings.parent.mkdir(parents=True)
                settings.touch()
            # A shell function intercepts python: no real application or Docker
            # command can run, even when the fixture says the rehearsal exists.
            stub = "python() { printf 'stub-python: %s\\n' \"$*\"; return \"$TEST_CLEANUP_EXIT_CODE\"; }\n"
            environment = {**os.environ, "TEST_CLEANUP_EXIT_CODE": str(exit_code)}
            return subprocess.run(
                [self.bash, "-e", "-c", stub + self.script],
                cwd=directory, env=environment, capture_output=True, text=True, timeout=10,
            )

    def test_unprepared_rehearsal_skips_cleanup(self):
        result = self.run_cleanup(prepared=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("stub-python:", result.stdout)
        self.assertIn("Rehearsal was not prepared", result.stdout)

    def test_prepared_rehearsal_runs_cleanup(self):
        result = self.run_cleanup(prepared=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("stub-python: infra/release.py down", result.stdout)

    def test_real_cleanup_failure_is_not_hidden(self):
        result = self.run_cleanup(prepared=True, exit_code=17)
        self.assertEqual(result.returncode, 17)
        self.assertIn("stub-python: infra/release.py down", result.stdout)


if __name__ == "__main__":
    unittest.main()
