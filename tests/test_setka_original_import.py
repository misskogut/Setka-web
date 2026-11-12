"""Offline regression for the two original-byte Yandex public download routes."""
import importlib.util
import io
import json
import pathlib
import unittest
from unittest.mock import patch

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "import-setka-original-audio.py"
spec = importlib.util.spec_from_file_location("setka_original_import", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class OriginalDownloadRoutesTest(unittest.TestCase):
    def setUp(self):
        self.entry = {
            "path": "/актив/актив монахи_01.wav",
            "sha256": "a" * 64,
            "bytes": 53210026,
        }
        self.metadata = {
            "sha256": self.entry["sha256"],
            "size": self.entry["bytes"],
            "file": "https://downloader.disk.yandex.ru/source-metadata",
        }
        self.download = {
            "href": "https://downloader.disk.yandex.ru/source-download",
        }
        self.urls = []

    def fake_open(self, request, timeout):
        url = request.full_url
        self.urls.append(url)
        data = self.download if "/public/resources/download?" in url else self.metadata
        return io.BytesIO(json.dumps(data).encode())

    def test_original_metadata_source(self):
        with patch.object(mod.urllib.request, "urlopen", side_effect=self.fake_open):
            url = mod.trusted_metadata(self.entry, alternate_download=False)
        self.assertEqual(url, self.metadata["file"])
        self.assertEqual(len(self.urls), 1)

    def test_dedicated_download_route_uses_verified_same_file(self):
        with patch.object(mod.urllib.request, "urlopen", side_effect=self.fake_open):
            url = mod.trusted_metadata(self.entry, alternate_download=True)
        self.assertEqual(url, self.download["href"])
        self.assertEqual(len(self.urls), 2)
        self.assertIn("/public/resources/download?", self.urls[-1])
        self.assertIn("public_key=", self.urls[-1])
        self.assertIn("path=", self.urls[-1])

    def test_changed_source_hash_refuses_both_routes(self):
        self.metadata["sha256"] = "b" * 64
        with patch.object(mod.urllib.request, "urlopen", side_effect=self.fake_open):
            with self.assertRaisesRegex(ValueError, "sha256 mismatch"):
                mod.trusted_metadata(self.entry, alternate_download=True)
        self.assertEqual(len(self.urls), 1)

    def test_untrusted_download_host_is_never_fetched(self):
        self.download["href"] = "https://untrusted.example/file.wav"
        with patch.object(mod.urllib.request, "urlopen", side_effect=self.fake_open):
            with self.assertRaisesRegex(ValueError, "unexpected media host"):
                mod.trusted_metadata(self.entry, alternate_download=True)

    def test_unexpected_source_size_is_rejected(self):
        self.metadata["size"] = 123
        with patch.object(mod.urllib.request, "urlopen", side_effect=self.fake_open):
            with self.assertRaisesRegex(ValueError, "source size changed"):
                mod.trusted_metadata(self.entry, alternate_download=False)

if __name__ == "__main__":
    unittest.main()
