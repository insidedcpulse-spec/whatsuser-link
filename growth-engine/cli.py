import sys
import argparse
import subprocess
from pathlib import Path

from config import TOPIC_CATALOG, CONTENT_DIR, BASE_DIR
from generator import publish_topic, send_telegram_publication_alert


def is_topic_published(slug: str) -> bool:
    pt_file = CONTENT_DIR / "pt" / f"{slug}.mdx"
    en_file = CONTENT_DIR / "en" / f"{slug}.mdx"
    es_file = CONTENT_DIR / "es" / f"{slug}.mdx"
    return pt_file.exists() and en_file.exists() and es_file.exists()


def list_status():
    print("\n=======================================================")
    print(" 🌟 WHATSUSERNAMES.LINK — AUTONOMOUS SEO GROWTH FACTORY")
    print("=======================================================\n")
    
    published_count = 0
    pending_count = 0
    
    print(f"{'#':<3} | {'STATUS':<10} | {'SLUG / IDENTIFICADOR':<45} | {'CATEGORIA'}")
    print("-" * 85)
    
    for idx, topic in enumerate(TOPIC_CATALOG, 1):
        slug = topic["slug"]
        published = is_topic_published(slug)
        if published:
            published_count += 1
            status_str = "✅ PUBLICADO"
        else:
            pending_count += 1
            status_str = "⏳ PENDENTE"
            
        print(f"{idx:<3} | {status_str:<10} | {slug:<45} | {topic.get('category')}")
        
    print("-" * 85)
    print(f"📊 Total no Catálogo: {len(TOPIC_CATALOG)} | Publicados: {published_count} | Prontos para Gerar: {pending_count}\n")


def run_tests() -> bool:
    print("🧪 A executar validação de testes do sistema (vitest)...")
    res = subprocess.run(["pnpm", "test"], cwd=str(BASE_DIR), capture_output=True, text=True)
    if res.returncode == 0:
        print("  ✅ 100% dos testes passaram com sucesso!")
        return True
    else:
        print(f"  ❌ Falha nos testes:\n{res.stdout[:500]}")
        return False


def generate_single(topic_identifier: str):
    # Procura por ID ou por Slug
    matched = None
    for t in TOPIC_CATALOG:
        if t["id"] == topic_identifier or t["slug"] == topic_identifier:
            matched = t
            break
            
    if not matched:
        print(f"❌ Tópico '{topic_identifier}' não encontrado no catálogo!")
        return
        
    stats = publish_topic(matched)
    
    # Valida testes
    tests_ok = run_tests()
    if tests_ok:
        print("🚀 A fazer commit, push e deploy em produção na Vercel...")
        try:
            subprocess.run(["git", "add", "."], cwd=str(BASE_DIR), check=True)
            subprocess.run(
                ["git", "commit", "-m", f"feat(blog): publish {matched['slug']} cluster"],
                cwd=str(BASE_DIR),
                check=False
            )
            subprocess.run(["git", "push", "origin", "master"], cwd=str(BASE_DIR), check=False)
            subprocess.run(["vercel", "deploy", "--prod", "--yes"], cwd=str(BASE_DIR), check=True)
            print("  ✅ Deploy em produção concluído com sucesso!")
        except Exception as e:
            print(f"  ⚠️ Aviso no deploy: {e}")

        send_telegram_publication_alert(matched, stats)
        print("\n🎉 Publicação concluída e notificação enviada no Telegram!")
    else:
        print("\n⚠️ O artigo foi gerado, mas os testes detetaram um aviso de integridade.")


def generate_next_pending():
    for t in TOPIC_CATALOG:
        if not is_topic_published(t["slug"]):
            print(f"\n🎯 Próximo tópico selecionado para geração autónoma: '{t['id']}'")
            generate_single(t["id"])
            return
            
    print("\n👏 Todos os tópicos do catálogo atual já estão publicados!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WhatsUsernames Autonomous SEO & Content Growth Factory")
    parser.add_argument("action", choices=["status", "next", "generate", "test"], default="status", nargs="?")
    parser.add_argument("--topic", type=str, help="ID ou Slug do tópico")
    
    args = parser.parse_args()
    
    if args.action == "status":
        list_status()
    elif args.action == "next":
        generate_next_pending()
    elif args.action == "generate":
        if not args.topic:
            print("Erro: especifica o tópico via --topic <id_ou_slug>")
        else:
            generate_single(args.topic)
    elif args.action == "test":
        run_tests()
