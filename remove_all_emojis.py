#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""絵文字を削除するスクリプト"""
import os
import re
from pathlib import Path

def remove_emojis_from_file(file_path):
    """ファイルから絵文字を削除"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        updated_lines = []
        changed = False
        
        for line in lines:
            original_line = line
            
            # 見出しの絵文字を削除
            line = re.sub(r'^##\s*[📁📚🗂️📋🔄🔧🚀⚠️📝✅❌💡🔍⚙️📊🎯💰⭐🏗️🎨🆘⚡🔐🌐📤]\s*', '## ', line)
            line = re.sub(r'^###\s*[📁📚🗂️📋🔄🔧🚀⚠️📝✅❌💡🔍⚙️📊🎯💰⭐🏗️🎨🆘⚡🔐🌐📤]\s*', '### ', line)
            line = re.sub(r'^####\s*[📁📚🗂️📋🔄🔧🚀⚠️📝✅❌💡🔍⚙️📊🎯💰⭐🏗️🎨🆘⚡🔐🌐📤]\s*', '#### ', line)
            
            # リストアイテムの絵文字を削除
            line = re.sub(r'^-\s*[✅⚠️❌]\s*', '- ', line)
            line = re.sub(r'^\d+\.\s*[✅⚠️❌]\s*', lambda m: m.group(0).split()[0] + '. ', line)
            
            # 文中の絵文字を削除（⚠️、✅、❌など）
            line = re.sub(r'[⚠️✅❌📊📤🌐]+\s*', '', line)
            line = re.sub(r'\s*[⚠️✅❌📊📤🌐]+', '', line)
            
            # テーブル内の絵文字を削除
            line = re.sub(r'\|\s*[✅❌⚠️]+\s*\|', lambda m: '| ' + ('必須' if '✅' in m.group(0) else 'オプション') + ' |', line)
            
            if line != original_line:
                changed = True
            
            updated_lines.append(line)
        
        if changed:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(updated_lines)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """メイン処理"""
    docs_dir = Path('docs')
    updated_count = 0
    
    for md_file in sorted(docs_dir.rglob('*.md')):
        if remove_emojis_from_file(md_file):
            print(f"Updated: {md_file}")
            updated_count += 1
    
    print(f"\nTotal files updated: {updated_count}")

if __name__ == '__main__':
    main()
