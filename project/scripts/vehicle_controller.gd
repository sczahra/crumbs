extends CharacterBody3D

## Lightweight placeholder for a driveable vehicle.
## Uses CharacterBody3D for simplicity; swap to a custom physics body for realism.
class_name VehicleController

@export var engine_force := 12.0
@export var max_speed := 20.0
@export var steering_speed := 1.5
@export var brake_strength := 16.0

var _current_speed := 0.0
var _steering_angle := 0.0

func _ready() -> void:
    add_to_group("vehicles")
    GameState.vehicle_entered.connect(_on_vehicle_entered)
    GameState.vehicle_exited.connect(_on_vehicle_exited)

func _physics_process(delta: float) -> void:
    if GameState.active_vehicle != self:
        velocity = Vector3.ZERO
        return
    _apply_engine(delta)
    _apply_steering(delta)
    _apply_movement(delta)

func _apply_engine(delta: float) -> void:
    var forward_input := Input.get_action_strength("accelerate") - Input.get_action_strength("reverse")
    var braking := Input.get_action_strength("brake")
    if braking > 0.1:
        _current_speed = lerp(_current_speed, 0.0, brake_strength * delta)
    else:
        _current_speed += forward_input * engine_force * delta
    _current_speed = clamp(_current_speed, -max_speed * 0.5, max_speed)

func _apply_steering(delta: float) -> void:
    var steer_input := Input.get_action_strength("steer_right") - Input.get_action_strength("steer_left")
    _steering_angle = lerp(_steering_angle, steer_input, steering_speed * delta)

func _apply_movement(delta: float) -> void:
    var forward_vector := -transform.basis.z
    var lateral_vector := transform.basis.x
    rotate_y(_steering_angle * _current_speed * 0.01 * delta)
    velocity = forward_vector * _current_speed
    move_and_slide()
    velocity -= lateral_vector * velocity.dot(lateral_vector) * 0.1

func _on_vehicle_entered(vehicle: Node3D) -> void:
    if vehicle == self:
        set_process_input(true)

func _on_vehicle_exited(vehicle: Node3D) -> void:
    if vehicle == self:
        _current_speed = 0.0
        _steering_angle = 0.0
        set_process_input(false)
