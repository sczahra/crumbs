extends Node3D

## Prototype house building manager inspired by The Sims.
## Responsible for placing modular building pieces when build mode is enabled.
class_name HouseBuilder

@export var ghost_material: StandardMaterial3D
@export var buildable_scenes: Array[PackedScene] = []
@export var grid_size := 2.0

var _current_scene: PackedScene
var _ghost_instance: Node3D

func _ready() -> void:
    if not buildable_scenes.is_empty():
        _current_scene = buildable_scenes[0]
    GameState.build_mode_toggled.connect(_on_build_mode_toggled)

func _physics_process(delta: float) -> void:
    if not GameState.build_mode_enabled:
        return
    _update_ghost_to_mouse()

func _input(event: InputEvent) -> void:
    if not GameState.build_mode_enabled:
        return
    if event.is_action_pressed("build_confirm"):
        _place_current_piece()
    elif event.is_action_pressed("build_cycle"):
        _cycle_piece()

func _update_ghost_to_mouse() -> void:
    var viewport := get_viewport()
    var camera := viewport.get_camera_3d()
    if not camera:
        return
    var mouse_pos := viewport.get_mouse_position()
    var from := camera.project_ray_origin(mouse_pos)
    var to := from + camera.project_ray_normal(mouse_pos) * 1000.0
    var space_state := get_world_3d().direct_space_state
    var params := PhysicsRayQueryParameters3D.new()
    params.from = from
    params.to = to
    var result := space_state.intersect_ray(params)
    if result:
        var position := result.position.snapped(Vector3.ONE * grid_size)
        if _ghost_instance == null:
            _spawn_ghost_instance()
        _ghost_instance.global_position = position

func _place_current_piece() -> void:
    if _current_scene == null or _ghost_instance == null:
        return
    var instance := _current_scene.instantiate()
    instance.global_transform = _ghost_instance.global_transform
    get_parent().add_child(instance)

func _cycle_piece() -> void:
    if buildable_scenes.is_empty():
        return
    var idx := buildable_scenes.find(_current_scene)
    idx = (idx + 1) % buildable_scenes.size()
    _current_scene = buildable_scenes[idx]
    _reset_ghost()

func _spawn_ghost_instance() -> void:
    if _current_scene == null:
        return
    _ghost_instance = _current_scene.instantiate()
    _ghost_instance.name = "GhostPreview"
    _ghost_instance.set_process(false)
    if ghost_material:
        for mesh in _get_mesh_instances(_ghost_instance):
            mesh.material_override = ghost_material
    add_child(_ghost_instance)

func _get_mesh_instances(node: Node) -> Array:
    var meshes: Array = []
    if node is MeshInstance3D:
        meshes.append(node)
    for child in node.get_children():
        meshes.append_array(_get_mesh_instances(child))
    return meshes

func _reset_ghost() -> void:
    if _ghost_instance:
        _ghost_instance.queue_free()
        _ghost_instance = null
    if GameState.build_mode_enabled:
        _spawn_ghost_instance()

func _on_build_mode_toggled(is_enabled: bool) -> void:
    if not is_enabled:
        _reset_ghost()
    else:
        _spawn_ghost_instance()
