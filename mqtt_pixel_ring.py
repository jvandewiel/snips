"""
 run specific code on pixelring based on incoming mqtt messages
 protocol
"""

import respeaker.usb_hid
from respeaker.spi import spi
import paho.mqtt.client as mqtt
import datetime
import json

class PixelRing:
    mono_mode = 1
    listening_mode = 2
    waiting_mode = 3
    speaking_mode = 4

    def __init__(self):
        self.hid = respeaker.usb_hid.get()

    def off(self):
        self.set_color(rgb=0)

    def set_color(self, rgb=None, r=0, g=0, b=0):
        if rgb:
            self.write(0, [self.mono_mode, rgb & 0xFF, (rgb >> 8) & 0xFF, (rgb >> 16) & 0xFF])
        else:
            self.write(0, [self.mono_mode, b, g, r])

    def listen(self, direction=None):
        if direction is None:
            self.write(0, [7, 0, 0, 0])
        else:
            print(direction)
            self.write(0, [2, 0, direction & 0xFF, (direction >> 8) & 0xFF])

    def wait(self):
        self.write(0, [self.waiting_mode, 0, 0, 0])

    def speak(self, strength, direction):
        self.write(0, [self.speaking_mode, strength, direction & 0xFF, (direction >> 8) & 0xFF])

    def set_volume(self, volume):
        self.write(0, [5, 0, 0, volume])

    @staticmethod
    def to_bytearray(data):
        if type(data) is int:
            array = bytearray([data & 0xFF])
        elif type(data) is bytearray:
            array = data
        elif type(data) is str:
            array = bytearray(data)
        elif type(data) is list:
            array = bytearray(data)
        else:
            raise TypeError('%s is not supported' % type(data))

        return array

    def write(self, address, data):
        data = self.to_bytearray(data)
        length = len(data)
        if self.hid:
            packet = bytearray([address & 0xFF, (address >> 8) & 0xFF, length & 0xFF, (length >> 8) & 0xFF]) + data
            self.hid.write(packet)
            #print(packet)
        spi.write(address=address, data=data)

    def close(self):
        if self.hid:
            self.hid.close()

pixel_ring = PixelRing()

def time_now():
    return datetime.datetime.now().strftime('%H:%M:%S.%f')

# MQTT client to connect to the bus
mqtt_client = mqtt.Client()

def on_connect(client, userdata, flags, rc):
    # subscribe to all messages
    mqtt_client.subscribe('/respeaker/pixels/off')
    mqtt_client.subscribe('/respeaker/pixels/wait')
    mqtt_client.subscribe('/respeaker/pixels/listen')
    mqtt_client.subscribe('/respeaker/pixels/color')
    mqtt_client.subscribe('/respeaker/pixels/volume')
    mqtt_client.subscribe('/respeaker/pixels/speak')
    
        
# Process a message as it arrives
def on_message(client, userdata, msg):
    if msg.topic == '/respeaker/pixels/off':
        print("Off")
        pixel_ring.off()
    elif msg.topic == '/respeaker/pixels/wait':
        print("Wait")
        pixel_ring.wait()
    elif msg.topic == '/respeaker/pixels/listen':
        print("Listen")
        pixel_ring.listen()
    elif msg.topic == '/respeaker/pixels/color':
        print("Color")
        data = json.loads(msg.payload)
        print(data);
        pixel_ring.set_color(rgb=data['color'])
    elif msg.topic == '/respeaker/pixels/volume':
        print("Volume")
        data = json.loads(msg.payload)
        print(data);
        pixel_ring.set_volume(data['volume'])
    elif msg.topic == '/respeaker/pixels/speak':
        print("Speak")
        data = json.loads(msg.payload)
        print(data);
        pixel_ring.speak(data['strength'], data['direction'], )
    
if __name__ == '__main__':
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    mqtt_client.connect('localhost', 1883)
    mqtt_client.loop_forever()

"""
handle incoming messages on mqtt and set pixels

if __name__ == '__main__':
    import time

    pixel_ring.listen()
    time.sleep(3)
    pixel_ring.wait()
    time.sleep(3)
    for level in range(2, 8):
        pixel_ring.speak(level, 0)
        time.sleep(1)
    pixel_ring.set_volume(4)
    time.sleep(3)

    color = 0x800000
    while True:
        try:
            pixel_ring.set_color(rgb=color)
            color += 0x10
            time.sleep(1)
        except KeyboardInterrupt:
            break

    pixel_ring.off()
"""
