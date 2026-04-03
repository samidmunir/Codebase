import random
import math
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon

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


def draw_rectangle(ax, cx, cy, width, height, angle, facecolor, edgecolor="black", alpha=0.8):
    """
    Draw a rotated rectangle on a matplotlib axis.
    """
    corners = get_rectangle_corners(cx, cy, width, height, angle)
    polygon = Polygon(corners, closed=True, facecolor=facecolor, edgecolor=edgecolor, alpha=alpha)
    ax.add_patch(polygon)

    # Draw center point
    ax.plot(cx, cy, marker="o", markersize=3, color="black")

    # Draw heading line
    front_mid_x = (corners[1][0] + corners[2][0]) / 2.0
    front_mid_y = (corners[1][1] + corners[2][1]) / 2.0
    ax.plot([cx, front_mid_x], [cy, front_mid_y], linewidth=2, color="black")


def robot_collides_with_any_obstacle(robot, obstacles):
    """
    Return True if the robot collides with any obstacle.
    """
    for obs in obstacles:
        if rectangles_collide(robot, obs):
            return True
    return False


def robot_state_is_valid(robot, obstacles):
    """
    A valid robot must:
    1. stay within world bounds
    2. not collide with any obstacle
    """
    if not rectangle_within_bounds(robot, WORLD_WIDTH, WORLD_HEIGHT):
        return False

    if robot_collides_with_any_obstacle(robot, obstacles):
        return False

    return True


def obstacle_is_valid(candidate_obstacle, placed_obstacles):
    """
    A valid obstacle must:
    1. remain fully within world bounds
    2. not overlap any already-placed obstacle
    """
    if not rectangle_within_bounds(candidate_obstacle, WORLD_WIDTH, WORLD_HEIGHT):
        return False

    for obs in placed_obstacles:
        if rectangles_collide(candidate_obstacle, obs):
            return False

    return True


def create_random_obstacle():
    """
    Create one random rectangular obstacle candidate.
    """
    width = random.uniform(8, 20)
    height = random.uniform(6, 18)
    angle = random.uniform(0, 180)

    # Use full world ranges; validity will be checked afterward
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
    """
    Generate non-overlapping obstacles using rejection sampling.
    """
    obstacles = []
    attempts = 0

    while len(obstacles) < num_obstacles and attempts < MAX_OBSTACLE_ATTEMPTS:
        candidate = create_random_obstacle()

        if obstacle_is_valid(candidate, obstacles):
            obstacles.append(candidate)

        attempts += 1

    return obstacles


def create_random_robot_pose(width=10, height=6):
    """
    Create one random robot pose candidate.
    """
    return {
        "cx": random.uniform(0, WORLD_WIDTH),
        "cy": random.uniform(0, WORLD_HEIGHT),
        "width": width,
        "height": height,
        "angle": random.uniform(0, 360),
    }


def pose_center_distance(pose_a, pose_b):
    """
    Euclidean distance between the centers of two poses.
    """
    dx = pose_a["cx"] - pose_b["cx"]
    dy = pose_a["cy"] - pose_b["cy"]
    return math.hypot(dx, dy)


def generate_start_and_goal(obstacles, robot_width=10, robot_height=6, min_center_distance=40):
    """
    Generate a valid start and goal pose for the robot.

    Conditions:
    - both must be individually valid
    - they must be at least min_center_distance apart
    """
    start = None
    goal = None

    # Find valid start
    for _ in range(MAX_POSE_ATTEMPTS):
        candidate = create_random_robot_pose(width=robot_width, height=robot_height)
        if robot_state_is_valid(candidate, obstacles):
            start = candidate
            break

    if start is None:
        return None, None

    # Find valid goal sufficiently far from start
    for _ in range(MAX_POSE_ATTEMPTS):
        candidate = create_random_robot_pose(width=robot_width, height=robot_height)

        if not robot_state_is_valid(candidate, obstacles):
            continue

        if pose_center_distance(start, candidate) < min_center_distance:
            continue

        goal = candidate
        break

    return start, goal


def main():
    random.seed(42)

    obstacles = generate_obstacles(NUM_OBSTACLES)
    start, goal = generate_start_and_goal(
        obstacles,
        robot_width=10,
        robot_height=6,
        min_center_distance=40
    )

    fig, ax = plt.subplots(figsize=(8, 8))

    # Draw obstacles
    for obs in obstacles:
        draw_rectangle(
            ax,
            cx=obs["cx"],
            cy=obs["cy"],
            width=obs["width"],
            height=obs["height"],
            angle=obs["angle"],
            facecolor="dimgray"
        )

    # Draw start pose
    if start is not None:
        draw_rectangle(
            ax,
            cx=start["cx"],
            cy=start["cy"],
            width=start["width"],
            height=start["height"],
            angle=start["angle"],
            facecolor="cornflowerblue",
            edgecolor="black",
            alpha=0.9
        )
        ax.text(start["cx"], start["cy"] + 4, "START", ha="center", va="bottom", fontsize=9)

    # Draw goal pose
    if goal is not None:
        draw_rectangle(
            ax,
            cx=goal["cx"],
            cy=goal["cy"],
            width=goal["width"],
            height=goal["height"],
            angle=goal["angle"],
            facecolor="mediumseagreen",
            edgecolor="black",
            alpha=0.9
        )
        ax.text(goal["cx"], goal["cy"] + 4, "GOAL", ha="center", va="bottom", fontsize=9)

    title_suffix = ""
    if len(obstacles) < NUM_OBSTACLES:
        title_suffix += f" | Only placed {len(obstacles)}/{NUM_OBSTACLES} obstacles"

    if start is None or goal is None:
        title_suffix += " | Failed to generate valid start/goal"

    ax.set_title(f"Milestone 3: Valid Random Environment{title_suffix}")
    ax.set_xlim(0, WORLD_WIDTH)
    ax.set_ylim(0, WORLD_HEIGHT)
    ax.set_aspect("equal")
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.grid(True)

    plt.show()


if __name__ == "__main__":
    main()