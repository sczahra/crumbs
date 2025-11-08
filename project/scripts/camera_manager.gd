extends Node3D

## Simple camera rig that switches between character and vehicle cameras.
## Keeps cameras following their respective targets with a configurable offset.
class_name CameraManager

@export var character_camera_path: NodePath
@export var vehicle_camera_path: NodePath
@export var character_offset := Vector3(0, 4, 6)
@export var vehicle_offset := Vector3(0, 6, 10)
@export var follow_smoothness := 5.0

var _character_camera: Camera3D
var _vehicle_camera: Camera3D
var _current_target: Node3D

func _ready() -> void:
    _character_camera = get_node_or_null(character_camera_path)
    _vehicle_camera = get_node_or_null(vehicle_camera_path)
    if _character_camera:
        _character_camera.current = true
    _current_target = GameState.player_character
    GameState.vehicle_entered.connect(_on_vehicle_entered)
    GameState.vehicle_exited.connect(_on_vehicle_exited)

func _process(delta: float) -> void:
    if _current_target == null and GameState.player_character:
        _current_target = GameState.player_character
    if GameState.player_character and _current_target == GameState.player_character and _character_camera:
        _follow_target(_character_camera, GameState.player_character, character_offset, delta)
    if GameState.active_vehicle and _current_target == GameState.active_vehicle and _vehicle_camera:
        _follow_target(_vehicle_camera, GameState.active_vehicle, vehicle_offset, delta)

func _follow_target(camera: Camera3D, target: Node3D, offset: Vector3, delta: float) -> void:
    var desired_position := target.global_transform.origin + offset.rotated(Vector3.UP, target.rotation.y)
    var xform := camera.global_transform
    xform.origin = xform.origin.lerp(desired_position, clamp(delta * follow_smoothness, 0.0, 1.0))
    camera.global_transform = xform
    camera.look_at(target.global_transform.origin, Vector3.UP)

func _on_vehicle_entered(vehicle: Node3D) -> void:
    if _vehicle_camera:
        _vehicle_camera.current = true
    _current_target = vehicle

func _on_vehicle_exited(vehicle: Node3D) -> void:
    if _character_camera:
        _character_camera.current = true
    _current_target = GameState.player_character

func reset_to_player() -> void:
    _current_target = GameState.player_character
