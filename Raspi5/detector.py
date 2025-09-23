#!/usr/bin/env python3
import time
import random
import json
from urllib.request import urlopen
from websocket import create_connection

def random_boxes():
    boxes = []
    if random.random() < 0.5:
        boxes.append({
            'x': random.random() * 0.6,
            'y': random.random() * 0.6,
            'w': 0.2 + random.random() * 0.3,
            'h': 0.2 + random.random() * 0.3,
            'label': 'motion'
        })
    return boxes

if __name__ == '__main__':
    ws = None
    try:
        ws = create_connection('ws://127.0.0.1:8420/ws')
    except Exception as e:
        print('ws connect failed', e)
    while True:
        try:
            # simple snapshot fetch to keep disk warm; not used in this placeholder
            try:
                resp = urlopen('http://127.0.0.1:8421/snapshot.jpg', timeout=2)
                _ = resp.read()
            except Exception:
                pass
            boxes = random_boxes()
            msg = json.dumps({'type':'boxes', 'boxes': boxes})
            if ws:
                try:
                    ws.send(msg)
                except Exception:
                    try:
                        ws = create_connection('ws://127.0.0.1:8420/ws')
                    except Exception as e:
                        print('reconnect failed', e)
            print('sent', msg)
            time.sleep(2)
        except KeyboardInterrupt:
            break
            msg = json.dumps({'type': 'boxes', 'boxes': boxes})
            if ws:
                try:
                    ws.send(msg)
                except Exception:
                    try:
                        ws = websocket.create_connection(SERVER_WS)
                    except Exception:
                        ws = None
            else:
                print('no ws, would send:', msg)

        except Exception as e:
            print('detector loop error', e)

        time.sleep(4)

# Main execution
if __name__ == '__main__':
    main()
