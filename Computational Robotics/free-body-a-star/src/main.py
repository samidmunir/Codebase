import random
import math
import heapq
import itertools
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
from matplotlib.animation import FuncAnimation

from geometry import (
    get_rectangle_corners,
    rectangles_collide,
    rectangle_within_bounds,
)


WORLD_WIDTH = 100
WORLD_HEIGHT = 100

NUM_OBSTACLES = 10
MAX_OBSTACLE_ATTEMPTS = 500
MAX_POSE_ATTEMPTS = 500

TRANSLATION_STEP = 5
ROTATION_STEP = 15

POSITION_TOLERANCE = TRANSLATION_STEP
ANGLE_TOLERANCE = ROTATION_STEP


def draw_rectangle(ax, cx, cy, width, height, angle, facecolor, edgecolor="black", alpha=0.8, linewidth=1.5):
    corners = get_rectangle_corners(cx, cy, width, height, angle)
    polygon = Polygon(
        corners,
        closed=True,
        facecolor=facecolor,
        edgecolor=edgecolor,
        alpha=alpha,
        linewidth=linewidth
    )
    ax.add_patch(polygon)

    ax.plot(cx, cy, marker="o", markersize=2.5, color="black")

    front_mid_x = (corners[1][0] + corners[2][0]) / 2.0
    front_mid_y = (corners[1][1] + corners[2][1]) / 2.0
    ax.plot([cx, front_mid_x], [cy, front_mid_y], linewidth=1.5, color="black")


def robot_collides_with_any_obstacle(robot, obstacles):
    for obs in obstacles:
        if rectangles_collide(robot, obs):
            return True
    return False


def robot_state_is_valid(robot, obstacles):
    if not rectangle_within_bounds(robot, WORLD_WIDTH, WORLD_HEIGHT):
        return False

    if robot_collides_with_any_obstacle(robot, obstacles):
        return False

    return True


def obstacle_is_valid(candidate_obstacle, placed_obstacles):
    if not rectangle_within_bounds(candidate_obstacle, WORLD_WIDTH, WORLD_HEIGHT):
        return False

    for obs in placed_obstacles:
        if rectangles_collide(candidate_obstacle, obs):
            return False

    return True


def create_random_obstacle():
    width = random.uniform(8, 20)
    height = random.uniform(6, 18)
    angle = random.uniform(0, 180)
    cx = random.uniform(0, WORLD_WIDTH)
    cy = random.uniform(0, WORLD_HEIGHT)

    return {
        "cx": cx,
        "cy": cy,
        "width": width,
        "height": height,
        "angle": angle,
    }


def generate_obstacles(num_obstacles):
    obstacles = []
    attempts = 0

    while len(obstacles) < num_obstacles and attempts < MAX_OBSTACLE_ATTEMPTS:
        candidate = create_random_obstacle()

        if obstacle_is_valid(candidate, obstacles):
            obstacles.append(candidate)

        attempts += 1

    return obstacles


def create_random_robot_pose(width=10, height=6):
    return {
        "cx": random.uniform(0, WORLD_WIDTH),
        "cy": random.uniform(0, WORLD_HEIGHT),
        "width": width,
        "height": height,
        "angle": random.uniform(0, 360),
    }


def pose_center_distance(pose_a, pose_b):
    dx = pose_a["cx"] - pose_b["cx"]
    dy = pose_a["cy"] - pose_b["cy"]
    return math.hypot(dx, dy)


def generate_start_and_goal(obstacles, robot_width=10, robot_height=6, min_center_distance=40):
    start = None
    goal = None

    for _ in range(MAX_POSE_ATTEMPTS):
        candidate = create_random_robot_pose(width=robot_width, height=robot_height)
        if robot_state_is_valid(candidate, obstacles):
            start = candidate
            break

    if start is None:
        return None, None

    for _ in range(MAX_POSE_ATTEMPTS):
        candidate = create_random_robot_pose(width=robot_width, height=robot_height)

        if not robot_state_is_valid(candidate, obstacles):
            continue

        if pose_center_distance(start, candidate) < min_center_distance:
            continue

        goal = candidate
        break

    return start, goal


def normalize_angle(angle_deg):
    return angle_deg % 360


def copy_pose(pose):
    return {
        "cx": pose["cx"],
        "cy": pose["cy"],
        "width": pose["width"],
        "height": pose["height"],
        "angle": pose["angle"],
    }


def generate_candidate_neighbors(robot):
    neighbors = []

    up_pose = copy_pose(robot)
    up_pose["cy"] += TRANSLATION_STEP
    neighbors.append(("up", up_pose, 1.0))

    down_pose = copy_pose(robot)
    down_pose["cy"] -= TRANSLATION_STEP
    neighbors.append(("down", down_pose, 1.0))

    left_pose = copy_pose(robot)
    left_pose["cx"] -= TRANSLATION_STEP
    neighbors.append(("left", left_pose, 1.0))

    right_pose = copy_pose(robot)
    right_pose["cx"] += TRANSLATION_STEP
    neighbors.append(("right", right_pose, 1.0))

    rotate_cw_pose = copy_pose(robot)
    rotate_cw_pose["angle"] = normalize_angle(rotate_cw_pose["angle"] - ROTATION_STEP)
    neighbors.append(("rotate_cw", rotate_cw_pose, 1.0))

    rotate_ccw_pose = copy_pose(robot)
    rotate_ccw_pose["angle"] = normalize_angle(rotate_ccw_pose["angle"] + ROTATION_STEP)
    neighbors.append(("rotate_ccw", rotate_ccw_pose, 1.0))

    return neighbors


def get_valid_neighbors(robot, obstacles):
    valid_neighbors = []

    for action_name, candidate_pose, step_cost in generate_candidate_neighbors(robot):
        if robot_state_is_valid(candidate_pose, obstacles):
            valid_neighbors.append((action_name, candidate_pose, step_cost))

    return valid_neighbors


def pose_to_key(pose):
    return (
        round(pose["cx"], 4),
        round(pose["cy"], 4),
        round(normalize_angle(pose["angle"]), 4),
    )


def key_to_pose(key, width, height):
    cx, cy, angle = key
    return {
        "cx": cx,
        "cy": cy,
        "width": width,
        "height": height,
        "angle": angle,
    }


def angular_difference_deg(a, b):
    diff = abs(normalize_angle(a) - normalize_angle(b))
    return min(diff, 360 - diff)


def goal_reached(current_pose, goal_pose):
    position_ok = pose_center_distance(current_pose, goal_pose) <= POSITION_TOLERANCE
    angle_ok = angular_difference_deg(current_pose["angle"], goal_pose["angle"]) <= ANGLE_TOLERANCE
    return position_ok and angle_ok


def heuristic(pose, goal_pose):
    translational_cost = pose_center_distance(pose, goal_pose) / TRANSLATION_STEP
    angular_cost = angular_difference_deg(pose["angle"], goal_pose["angle"]) / ROTATION_STEP
    return translational_cost + 0.5 * angular_cost


def reconstruct_path(came_from, current_key, robot_width, robot_height):
    path_keys = [current_key]

    while current_key in came_from:
        current_key = came_from[current_key]
        path_keys.append(current_key)

    path_keys.reverse()
    return [key_to_pose(k, robot_width, robot_height) for k in path_keys]


def a_star_search(start_pose, goal_pose, obstacles):
    robot_width = start_pose["width"]
    robot_height = start_pose["height"]

    start_key = pose_to_key(start_pose)

    open_heap = []
    counter = itertools.count()

    g_cost = {start_key: 0.0}
    came_from = {}

    start_f = heuristic(start_pose, goal_pose)
    heapq.heappush(open_heap, (start_f, next(counter), start_pose))

    closed_set = set()
    explored_poses = []

    while open_heap:
        _, _, current_pose = heapq.heappop(open_heap)
        current_key = pose_to_key(current_pose)

        if current_key in closed_set:
            continue

        closed_set.add(current_key)
        explored_poses.append(copy_pose(current_pose))

        if goal_reached(current_pose, goal_pose):
            path = reconstruct_path(came_from, current_key, robot_width, robot_height)
            return path, explored_poses

        for action_name, neighbor_pose, step_cost in get_valid_neighbors(current_pose, obstacles):
            neighbor_key = pose_to_key(neighbor_pose)

            if neighbor_key in closed_set:
                continue

            tentative_g = g_cost[current_key] + step_cost

            if neighbor_key not in g_cost or tentative_g < g_cost[neighbor_key]:
                g_cost[neighbor_key] = tentative_g
                came_from[neighbor_key] = current_key

                f_cost = tentative_g + heuristic(neighbor_pose, goal_pose)
                heapq.heappush(open_heap, (f_cost, next(counter), copy_pose(neighbor_pose)))

    return None, explored_poses


def create_robot_artists(ax, pose, facecolor="royalblue", edgecolor="black", alpha=0.95, linewidth=2.0):
    """
    Create reusable matplotlib artists for a robot:
    - polygon body
    - center point
    - heading line

    Returns:
        polygon_patch, center_line, heading_line
    """
    corners = get_rectangle_corners(pose["cx"], pose["cy"], pose["width"], pose["height"], pose["angle"])

    polygon_patch = Polygon(
        corners,
        closed=True,
        facecolor=facecolor,
        edgecolor=edgecolor,
        alpha=alpha,
        linewidth=linewidth
    )
    ax.add_patch(polygon_patch)

    center_line, = ax.plot([pose["cx"]], [pose["cy"]], marker="o", markersize=4, color="black")

    front_mid_x = (corners[1][0] + corners[2][0]) / 2.0
    front_mid_y = (corners[1][1] + corners[2][1]) / 2.0
    heading_line, = ax.plot([pose["cx"], front_mid_x], [pose["cy"], front_mid_y], linewidth=2, color="black")

    return polygon_patch, center_line, heading_line


def update_robot_artists(polygon_patch, center_line, heading_line, pose):
    """
    Update existing robot artists to match a new pose.
    """
    corners = get_rectangle_corners(pose["cx"], pose["cy"], pose["width"], pose["height"], pose["angle"])
    polygon_patch.set_xy(corners)

    center_line.set_data([pose["cx"]], [pose["cy"]])

    front_mid_x = (corners[1][0] + corners[2][0]) / 2.0
    front_mid_y = (corners[1][1] + corners[2][1]) / 2.0
    heading_line.set_data([pose["cx"], front_mid_x], [pose["cy"], front_mid_y])


def animate_path(obstacles, start, goal, path):
    """
    Animate the robot executing the planned path.
    """
    fig, ax = plt.subplots(figsize=(9, 9))

    # Static world
    for obs in obstacles:
        draw_rectangle(
            ax,
            cx=obs["cx"],
            cy=obs["cy"],
            width=obs["width"],
            height=obs["height"],
            angle=obs["angle"],
            facecolor="dimgray",
            edgecolor="black",
            alpha=0.9,
            linewidth=1.2
        )

    # Draw start and goal lightly in the background
    draw_rectangle(
        ax,
        cx=start["cx"],
        cy=start["cy"],
        width=start["width"],
        height=start["height"],
        angle=start["angle"],
        facecolor="cornflowerblue",
        edgecolor="black",
        alpha=0.25,
        linewidth=1.5
    )
    ax.text(start["cx"], start["cy"] + 4, "START", ha="center", va="bottom", fontsize=9)

    draw_rectangle(
        ax,
        cx=goal["cx"],
        cy=goal["cy"],
        width=goal["width"],
        height=goal["height"],
        angle=goal["angle"],
        facecolor="mediumseagreen",
        edgecolor="black",
        alpha=0.25,
        linewidth=1.5
    )
    ax.text(goal["cx"], goal["cy"] + 4, "GOAL", ha="center", va="bottom", fontsize=9)

    # Path center trace
    path_x = [pose["cx"] for pose in path]
    path_y = [pose["cy"] for pose in path]
    ax.plot(path_x, path_y, linestyle="--", linewidth=1.5, alpha=0.8)

    # Animated robot
    polygon_patch, center_line, heading_line = create_robot_artists(
        ax,
        path[0],
        facecolor="orangered",
        edgecolor="black",
        alpha=0.95,
        linewidth=2.0
    )

    ax.set_xlim(0, WORLD_WIDTH)
    ax.set_ylim(0, WORLD_HEIGHT)
    ax.set_aspect("equal")
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.grid(True)

    def update(frame_index):
        pose = path[frame_index]
        update_robot_artists(polygon_patch, center_line, heading_line, pose)
        ax.set_title(f"Milestone 6: Path Execution Animation | Step {frame_index + 1}/{len(path)}")
        return polygon_patch, center_line, heading_line

    anim = FuncAnimation(
        fig,
        update,
        frames=len(path),
        interval=350,
        blit=False,
        repeat=False
    )

    plt.show()
    return anim


def show_search_result(obstacles, start, goal, path, explored):
    """
    Show the static search visualization from Milestone 5.
    """
    fig, ax = plt.subplots(figsize=(9, 9))

    for obs in obstacles:
        draw_rectangle(
            ax,
            cx=obs["cx"],
            cy=obs["cy"],
            width=obs["width"],
            height=obs["height"],
            angle=obs["angle"],
            facecolor="dimgray",
            edgecolor="black",
            alpha=0.9,
            linewidth=1.2
        )

    for pose in explored:
        draw_rectangle(
            ax,
            cx=pose["cx"],
            cy=pose["cy"],
            width=pose["width"],
            height=pose["height"],
            angle=pose["angle"],
            facecolor="gold",
            edgecolor="goldenrod",
            alpha=0.08,
            linewidth=0.6
        )

    if path is not None:
        for pose in path:
            draw_rectangle(
                ax,
                cx=pose["cx"],
                cy=pose["cy"],
                width=pose["width"],
                height=pose["height"],
                angle=pose["angle"],
                facecolor="red",
                edgecolor="darkred",
                alpha=0.18,
                linewidth=0.8
            )

    draw_rectangle(
        ax,
        cx=start["cx"],
        cy=start["cy"],
        width=start["width"],
        height=start["height"],
        angle=start["angle"],
        facecolor="cornflowerblue",
        edgecolor="black",
        alpha=0.95,
        linewidth=2.0
    )
    ax.text(start["cx"], start["cy"] + 4, "START", ha="center", va="bottom", fontsize=9)

    draw_rectangle(
        ax,
        cx=goal["cx"],
        cy=goal["cy"],
        width=goal["width"],
        height=goal["height"],
        angle=goal["angle"],
        facecolor="mediumseagreen",
        edgecolor="black",
        alpha=0.95,
        linewidth=2.0
    )
    ax.text(goal["cx"], goal["cy"] + 4, "GOAL", ha="center", va="bottom", fontsize=9)

    if path is None:
        title = f"Milestone 5: A* Search Visualization | No Path Found | Explored={len(explored)}"
    else:
        title = f"Milestone 5: A* Search Visualization | Explored={len(explored)} | Path Length={len(path)}"

    ax.set_title(title)
    ax.set_xlim(0, WORLD_WIDTH)
    ax.set_ylim(0, WORLD_HEIGHT)
    ax.set_aspect("equal")
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.grid(True)

    plt.show()


def shortest_angle_delta(a, b):
    """
    Compute smallest signed angular difference from a -> b.
    Result in range [-180, 180].
    """
    diff = (b - a + 180) % 360 - 180
    return diff


def interpolate_pose(pose_a, pose_b, t):
    """
    Interpolate between two poses using parameter t in [0, 1].
    """
    cx = pose_a["cx"] + t * (pose_b["cx"] - pose_a["cx"])
    cy = pose_a["cy"] + t * (pose_b["cy"] - pose_a["cy"])

    delta_angle = shortest_angle_delta(pose_a["angle"], pose_b["angle"])
    angle = normalize_angle(pose_a["angle"] + t * delta_angle)

    return {
        "cx": cx,
        "cy": cy,
        "width": pose_a["width"],
        "height": pose_a["height"],
        "angle": angle,
    }


def expand_path_with_interpolation(path, steps_per_segment=5):
    """
    Expand discrete path into smooth path by interpolation.
    """
    smooth_path = []

    for i in range(len(path) - 1):
        a = path[i]
        b = path[i + 1]

        for step in range(steps_per_segment):
            t = step / steps_per_segment
            smooth_path.append(interpolate_pose(a, b, t))

    smooth_path.append(path[-1])
    return smooth_path

def main():
    random.seed(42)

    obstacles = generate_obstacles(NUM_OBSTACLES)
    start, goal = generate_start_and_goal(
        obstacles,
        robot_width=10,
        robot_height=6,
        min_center_distance=40
    )

    if start is None or goal is None:
        print("Failed to generate a valid planning problem.")
        return

    path, explored = a_star_search(start, goal, obstacles)

    show_search_result(obstacles, start, goal, path, explored)

    if path is None:
        print("No path found.")
        return

    print(f"Path found with {len(path)} states.")
    print(f"Explored {len(explored)} states.")

    animate_path(obstacles, start, goal, path)


if __name__ == "__main__":
    main()