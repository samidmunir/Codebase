import random
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon

from geometry import (
    get_rectangle_corners,
    rectangles_collide,
    rectangle_within_bounds,
)


WORLD_WIDTH = 100
WORLD_HEIGHT = 100


def create_random_obstacles(num_obstacles):
    """
    Create a list of random rectangular obstacles.
    """
    obstacles = []

    for _ in range(num_obstacles):
        width = random.uniform(8, 20)
        height = random.uniform(6, 18)
        cx = random.uniform(width / 2, WORLD_WIDTH - width / 2)
        cy = random.uniform(height / 2, WORLD_HEIGHT - height / 2)
        angle = random.uniform(0, 180)

        obstacles.append({
            "cx": cx,
            "cy": cy,
            "width": width,
            "height": height,
            "angle": angle
        })

    return obstacles


def draw_rectangle(ax, cx, cy, width, height, angle, facecolor, edgecolor="black", alpha=0.8):
    """
    Draw a rotated rectangle on a matplotlib axis.
    """
    corners = get_rectangle_corners(cx, cy, width, height, angle)
    polygon = Polygon(corners, closed=True, facecolor=facecolor, edgecolor=edgecolor, alpha=alpha)
    ax.add_patch(polygon)

    # Draw center point
    ax.plot(cx, cy, marker="o", markersize=3, color="black")

    # Draw a heading line using the midpoint of one edge
    front_mid_x = (corners[1][0] + corners[2][0]) / 2.0
    front_mid_y = (corners[1][1] + corners[2][1]) / 2.0
    ax.plot([cx, front_mid_x], [cy, front_mid_y], linewidth=2, color="black")


def robot_collides_with_any_obstacle(robot, obstacles):
    """
    Return True if the robot collides with at least one obstacle.
    """
    for obs in obstacles:
        if rectangles_collide(robot, obs):
            return True
    return False


def robot_state_is_valid(robot, obstacles):
    """
    A valid robot state must:
    1. remain fully within the world
    2. not collide with any obstacle
    """
    if not rectangle_within_bounds(robot, WORLD_WIDTH, WORLD_HEIGHT):
        return False

    if robot_collides_with_any_obstacle(robot, obstacles):
        return False

    return True


def main():
    random.seed(42)

    fig, ax = plt.subplots(figsize=(8, 8))

    obstacles = create_random_obstacles(num_obstacles=10)

    # Try changing these values to test:
    robot = {
        "cx": 20,
        "cy": 20,
        "width": 10,
        "height": 6,
        "angle": 120
    }

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

    # Check robot validity
    is_valid = robot_state_is_valid(robot, obstacles)

    robot_color = "cornflowerblue" if is_valid else "tomato"

    draw_rectangle(
        ax,
        cx=robot["cx"],
        cy=robot["cy"],
        width=robot["width"],
        height=robot["height"],
        angle=robot["angle"],
        facecolor=robot_color
    )

    status_text = "VALID" if is_valid else "INVALID / COLLIDING"
    ax.set_title(f"Milestone 2: Collision Detection ({status_text})")

    ax.set_xlim(0, WORLD_WIDTH)
    ax.set_ylim(0, WORLD_HEIGHT)
    ax.set_aspect("equal")
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.grid(True)

    plt.show()


if __name__ == "__main__":
    main()