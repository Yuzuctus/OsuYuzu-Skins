import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("build_bundle", Path(__file__).with_name("build-bundle.py"))
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class BuildBundleTest(unittest.TestCase):
    def test_preserves_files_with_distinct_names_and_reports_missing(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            ids = ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"]
            rows = []
            for index, identifier in enumerate(ids):
                key = f"skins/{identifier}.osk"
                file = root / "files" / key
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(f"skin {index}".encode())
                rows.append({"name": "same", "skin_file_key": key, "skin_file_name": "same.osk", "skin_file_size": file.stat().st_size})
            rows.append({"name": "no file", "skin_file_key": None, "download_url": None})
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps(rows), encoding="utf-8")
            result = module.build(root, manifest)
            self.assertEqual(result["fileCount"], 2)
            archive = root / "files" / "bundles" / "all.zip"
            with zipfile.ZipFile(archive) as zip_file:
                self.assertIsNone(zip_file.testzip())
                self.assertEqual(zip_file.namelist(), ["same.osk", "same-2.osk", "README-missing-skins.txt"])
                self.assertIn("no file", zip_file.read("README-missing-skins.txt").decode())
            self.assertEqual(json.loads(Path(f"{archive}.json").read_text())["sha256"], result["sha256"])


if __name__ == "__main__":
    unittest.main()
