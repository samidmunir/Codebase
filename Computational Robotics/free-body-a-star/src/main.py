import random
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon

from geometry import get_rectangle_corners


WORLD_WIDTH = 100
WORLD_HEIGHT = 100


def create_random_obstacles(num_obstacles):
    """
    Create a list of random rectangular obstacles.

    Each obstacle is represented as a dictionary with:
        cx, cy, width, height, angle
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
    ax.plot(cx, cy, marker="o", markersize=3)

    # Draw heading line to show orientation
    # We use the midpoint of the "front" edge.
    front_mid_x = (corners[1][0] + corners[2][0]) / 2.0
    front_mid_y = (corners[1][1] + corners[2][1]) / 2.0
    ax.plot([cx, front_mid_x], [cy, front_mid_y], linewidth=2)


def main():
    fig, ax = plt.subplots(figsize=(8, 8))

    # Create random obstacles
    obstacles = create_random_obstacles(num_obstacles=8)

    # Define one robot
    robot = {
        "cx": 20,
        "cy": 20,
        "width": 10,
        "height": 6,
        "angle": 30
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

    # Draw robot
    draw_rectangle(
        ax,
        cx=robot["cx"],
        cy=robot["cy"],
        width=robot["width"],
        height=robot["height"],
        angle=robot["angle"],
        facecolor="cornflowerblue"
    )

    # Plot settings
    ax.set_xlim(0, WORLD_WIDTH)
    ax.set_ylim(0, WORLD_HEIGHT)
    ax.set_aspect("equal")
    ax.set_title("Milestone 1: Rotated Rectangles in a 2D World")
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.grid(True)

    plt.show()


if __name__ == "__main__":
    main()