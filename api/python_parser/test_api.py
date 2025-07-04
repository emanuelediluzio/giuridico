#!/usr/bin/env python3
"""
Script di test per l'API PDF Parser
"""

import requests
import json
import sys
from pathlib import Path

def test_health_endpoint(base_url):
    """Test dell'endpoint health"""
    print("🔍 Testando endpoint health...")
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check OK")
            print(f"   Status: {data.get('status')}")
            print(f"   Version: {data.get('version')}")
            print(f"   Model loaded: {data.get('model_loaded')}")
            print(f"   Nanonets loaded: {data.get('nanonets_loaded')}")
            return True
        else:
            print(f"❌ Health check fallito: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Errore health check: {e}")
        return False

def test_home_endpoint(base_url):
    """Test dell'endpoint home"""
    print("🔍 Testando endpoint home...")
    try:
        response = requests.get(f"{base_url}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("✅ Home endpoint OK")
            print(f"   Message: {data.get('message')}")
            return True
        else:
            print(f"❌ Home endpoint fallito: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Errore home endpoint: {e}")
        return False

def test_ocr_endpoint(base_url, test_file=None):
    """Test dell'endpoint OCR"""
    print("🔍 Testando endpoint OCR...")
    
    if not test_file or not Path(test_file).exists():
        print("⚠️  File di test non trovato, saltando test OCR")
        return True
    
    try:
        with open(test_file, 'rb') as f:
            files = {'file': f}
            response = requests.post(
                f"{base_url}/ocr-nanonets/", 
                files=files, 
                timeout=120  # Timeout più lungo per OCR
            )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ OCR endpoint OK")
            print(f"   Text length: {len(data.get('text', ''))}")
            return True
        else:
            print(f"❌ OCR endpoint fallito: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Errore OCR endpoint: {e}")
        return False

def main():
    """Funzione principale di test"""
    if len(sys.argv) < 2:
        print("Usage: python test_api.py <base_url> [test_file]")
        print("Example: python test_api.py https://your-space.hf.space test.pdf")
        sys.exit(1)
    
    base_url = sys.argv[1].rstrip('/')
    test_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    print(f"🚀 Testando API su: {base_url}")
    print("=" * 50)
    
    # Test degli endpoint
    tests = [
        ("Health", lambda: test_health_endpoint(base_url)),
        ("Home", lambda: test_home_endpoint(base_url)),
        ("OCR", lambda: test_ocr_endpoint(base_url, test_file))
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 Test: {test_name}")
        result = test_func()
        results.append((test_name, result))
    
    # Riepilogo
    print("\n" + "=" * 50)
    print("📊 Riepilogo Test:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Risultato: {passed}/{len(results)} test passati")
    
    if passed == len(results):
        print("🎉 Tutti i test sono passati! L'API è funzionante.")
        sys.exit(0)
    else:
        print("⚠️  Alcuni test sono falliti. Controlla la configurazione.")
        sys.exit(1)

if __name__ == "__main__":
    main() 