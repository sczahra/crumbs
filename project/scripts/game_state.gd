extends Node

## Global singleton keeping high-level gameplay state.
## Provides simple hooks for entering/exiting vehicles and tracking build mode.
class_name GameState

signal vehicle_entered(vehicle)
signal vehicle_exited(vehicle)
signal build_mode_toggled(is_enabled)

var player_character: Node3D
var active_vehicle: Node3D
var build_mode_enabled := false

func register_player(player: Node3D) -> void:
    player_character = player

func request_enter_vehicle(vehicle: Node3D) -> void:
    if active_vehicle == vehicle:
        return
    active_vehicle = vehicle
    emit_signal("vehicle_entered", vehicle)

func request_exit_vehicle(vehicle: Node3D) -> void:
    if active_vehicle != vehicle:
        return
    active_vehicle = null
    emit_signal("vehicle_exited", vehicle)

func toggle_build_mode() -> void:
    build_mode_enabled = !build_mode_enabled
    emit_signal("build_mode_toggled", build_mode_enabled)
