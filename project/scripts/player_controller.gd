extends CharacterBody3D

## Basic third-person player controller stub.
## Provides hooks for entering/exiting vehicles and invoking build mode.
class_name PlayerController

@export var acceleration := 6.0
@export var max_speed := 5.0
@export var gravity := ProjectSettings.get_setting("physics/3d/default_gravity")

var _camera_pivot: Node3D

func _ready() -> void:
    GameState.register_player(self)
    _camera_pivot = $CameraPivot if has_node("CameraPivot") else null

func _physics_process(delta: float) -> void:
    if GameState.active_vehicle:
        velocity = Vector3.ZERO
        return
    var input_dir := _get_input_direction()
    var target_velocity := input_dir * max_speed
    velocity.x = lerp(velocity.x, target_velocity.x, acceleration * delta)
    velocity.z = lerp(velocity.z, target_velocity.z, acceleration * delta)
    if not is_on_floor():
        velocity.y -= gravity * delta
    else:
        velocity.y = 0
    move_and_slide()
    if input_dir.length() > 0.1:
        look_at(global_transform.origin + Vector3(input_dir.x, 0, input_dir.z), Vector3.UP)

func _input(event: InputEvent) -> void:
    if event.is_action_pressed("enter_vehicle"):
        _try_enter_nearby_vehicle()
    elif event.is_action_pressed("exit_vehicle"):
        _try_exit_vehicle()
    elif event.is_action_pressed("toggle_build_mode"):
        GameState.toggle_build_mode()

func _get_input_direction() -> Vector3:
    var dir := Vector3.ZERO
    dir.z -= Input.get_action_strength("move_forward")
    dir.z += Input.get_action_strength("move_backward")
    dir.x -= Input.get_action_strength("move_left")
    dir.x += Input.get_action_strength("move_right")
    return dir.normalized()

func _try_enter_nearby_vehicle() -> void:
    var vehicles := get_tree().get_nodes_in_group("vehicles")
    for vehicle in vehicles:
        if global_position.distance_to(vehicle.global_position) < 3.0:
            GameState.request_enter_vehicle(vehicle)
            hide()
            return

func _try_exit_vehicle() -> void:
    if GameState.active_vehicle:
        var vehicle := GameState.active_vehicle
        GameState.request_exit_vehicle(vehicle)
        global_position = vehicle.global_position + Vector3.LEFT * 2.0
        show()
