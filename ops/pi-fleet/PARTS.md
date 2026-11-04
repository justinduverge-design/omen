# Pi fleet parts list

When a Pi alert says a part is failing, buy from this page. Hardware alerts link here (`B13-HEAL-PARTS-LIST`,
design: `Direction/reviews/2026-10-29-self-healing-design.md`, "When the founder is not there").

Hardware as observed by the inventory audit (`Valor-Core/inventory/snapshots/2026-10-26/`):

| Pi | Board | Boots from | Power input |
|---|---|---|---|
| Command Center | Raspberry Pi 4 Model B | USB SSD (SD card in the slot as the fallback) | USB-C, 5.1 V 3 A |
| Steward | Raspberry Pi Zero 2 W | 64 GB microSD | micro-USB (the `PWR IN` port), 5.1 V 2.5 A |
| Sentinel | Raspberry Pi Zero 2 W | 64 GB microSD | micro-USB (the `PWR IN` port), 5.1 V 2.5 A |

**Command Center's current SSD (read 2026-11-01):** `lsblk` reports model `Lufasnd`, 476.9 GB, on `sda` over USB, in a
Sabrent USB enclosure (`lsusb`: JMicron `152d:a578`). The SSD is powered through a USB hub with its own power supply
(founder, 2026-11-02; the hub model is not recorded). The cable model is not recorded.

## Which alert means which part

| Alert check name | Meaning | Buy |
|---|---|---|
| `under-voltage` | `vcgencmd get_throttled` reports under-voltage now or since boot | that Pi's power supply; if it repeats with the new supply, its cable (Pi 4) |
| `thermal` | 70 °C or more, or the chip capped or throttled its clock now or since boot | that Pi's case (the heatsink case, below); check airflow first |
| `ssd-missing` | Command Center cannot see its SSD | SSD and cable |
| `booted-from-sd` | Command Center booted from the backup SD card, so the SSD did not boot | SSD and cable; after the swap, the next weekly copy refreshes the SD |

The dispatcher appends a link to this page to any alert whose `check=` name contains one of these. Producers: `under-voltage` and `thermal` come from `B13-HEAL-WATCHDOG`, `booted-from-sd` and `ssd-missing` from `B13-HEAL-SD-SYNC` (`ops/pi-fleet/sd-sync/slops-boot-check`). Use these exact names in
any new hardware alert.

## Exact parts

Use the official Raspberry Pi supplies. Phone chargers sag under load and cause the under-voltage alert this page
exists for.

| Part | For | Exact model | Spare? |
|---|---|---|---|
| Power supply | Command Center | Raspberry Pi 15W USB-C Power Supply (official, 5.1 V 3 A, US plug) | yes, keep one |
| Power supply | Steward, Sentinel | Raspberry Pi 12.5W Micro USB Power Supply (official, 5.1 V 2.5 A, US plug) | yes, one covers both |
| SSD | Command Center | Samsung T7 Portable SSD 500 GB (`MU-PC500T/AM`), USB 3.2, draws little enough power to run without a powered hub | no; buy on alert |
| SSD (second choice) | Command Center | SanDisk Extreme Portable SSD 500 GB (`SDSSDE61-500G`) | no |
| SSD cable | Command Center | the USB-C to USB-A cable in the SSD box, into a **blue** USB 3 port; spare: Anker USB-C to USB-A 3.x cable, 1 ft | yes, keep one |
| microSD card | all three (Command Center's fallback card too) | SanDisk High Endurance 64 GB microSDXC (`SDSQQNR-064G`) | yes, keep one, pre-flashed if possible |
| microSD (second choice) | all three | Samsung PRO Endurance 64 GB microSDXC (`MB-MJ64KA`) | no |

Endurance cards are rated for constant writes (dashcam use), which is what a Pi's logs do to an SD card.

## What the founder bought (Amazon links, 2026-11-02)

The parts in use now. Rebuy these first; the table above is the fallback when a link is out of stock.

| Part | For | Link |
|---|---|---|
| Power supply | Steward, Sentinel (same one) | https://a.co/d/04QlLi4G |
| Case | Steward, Sentinel (same one) | https://a.co/d/0fJe1wAN |
| Power supply | Command Center | https://a.co/d/06t7lcYn |
| Case | Command Center | https://a.co/d/0cf6FTqh |
| Storage | Command Center | https://a.co/d/04WL1OJ5 |
| Storage | Command Center | https://a.co/d/0eqrn9K9 |
| Powered USB hub | Command Center's SSD | model not recorded |

## Where to buy

Stock changes: check the store's app for "pick up today" before driving.

| Store | Speed | Power supplies | SSD | microSD |
|---|---|---|---|---|
| Amazon | overnight or same day in most metro areas | yes (official) | yes | yes |
| Micro Center | same day, in store | yes (official, Raspberry Pi aisle) | yes | yes |
| Best Buy | same day pickup | rarely | Samsung T7, SanDisk Extreme | SanDisk, Samsung |
| Staples | same day pickup | no | sometimes | SanDisk |
| Walmart | same day pickup or delivery | third-party only: avoid | Samsung T7 often | SanDisk, Samsung |
| Target | same day pickup or delivery | no | sometimes | SanDisk |

No Pi power supply in stock nearby? Order the official one overnight and leave the Pi on its current supply. An
under-voltage warning is not an outage yet.

## After the part arrives

- Power supply: swap it, then check `vcgencmd get_throttled` reads `throttled=0x0` after a reboot.
- SSD: the system is lost with the old SSD. Restore from the weekly SD copy (`B13-HEAL-SD-SYNC`) or rebuild, then
  set `BOOT_ORDER=0xf14` again if the EEPROM was reset.
- SD card: flash Raspberry Pi OS Lite (64-bit) with Raspberry Pi Imager, then restore that Pi's config from
  `ops/pi-fleet/`.
