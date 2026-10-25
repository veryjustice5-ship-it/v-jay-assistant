#!/usr/bin/env python3
import unittest
import sys
import os

# Add directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from tests.test_classifier import TestMessageClassifier
from tests.test_responses import TestResponseGenerator
from tests.test_safety import TestSafetyAndPipeline

def run_all_tests():
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestMessageClassifier))
    suite.addTests(loader.loadTestsFromTestCase(TestResponseGenerator))
    suite.addTests(loader.loadTestsFromTestCase(TestSafetyAndPipeline))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)

if __name__ == '__main__':
    run_all_tests()
