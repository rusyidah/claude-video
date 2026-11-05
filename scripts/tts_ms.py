import certifi, asyncio, sys
certifi.where = lambda: "/root/.ccr/ca-bundle.crt"
import edge_tts
async def main():
    c = edge_tts.Communicate(sys.argv[1], "ms-MY-YasminNeural", rate=sys.argv[3])
    sub = edge_tts.SubMaker()
    with open(sys.argv[2], "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio": f.write(ch["data"])
            elif ch["type"] in ("WordBoundary","SentenceBoundary"): sub.feed(ch)
    print(sub.get_srt())
asyncio.run(main())
