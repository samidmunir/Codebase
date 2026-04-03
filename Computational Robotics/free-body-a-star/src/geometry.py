import math

"""
    Rotate a point (x, y) about the origin by angle_deg degrees.

    Parameters:
        x (float): Local x-coordinate
        y (float): Local y-coordinate
        angle_deg (float): Rotation angle in degrees

    Returns:
        tuple[float, float]: Rotated point (xr, yr)
"""
def rotate_point(x, y, angle_deg):
    theta = math.radians(angle_deg)
    cos_t = math.cos(theta)
    sin__t = math.sin(theta)

    xr = x * cos_t - y * sin__t
    yr = x * sin__t + y * cos_t

    return xr, yr

"""
    Compute the 4 world-space corners of a rectangle centered at (cx, cy), with the given width, height, and rotation angle in degrees.

    Corner order: bottom-left, bottom-right, top-right, top-left before rotation in the rectangle's local frame.

    Parameters:
        cx (float): Center x-coordinate
        cy (float): Center y-coordinate
        width (float): Rectangle width
        height (float): Rectangle height
        angle_deg (float): Rotation angle in degrees

    Returns:
        list[tuple[float, float]]: List of 4 (x, y) world-space corners
"""
def get_rectangle_corners(cx, cy, width, height, angle_deg):
    half_w = width / 2.0
    half_h = height / 2.0

    # Local corners relative to the rectangle center
    local_corners = [
        (-half_w, -half_h),
        (half_w, -half_h),
        (half_w, half_h),
        (-half_w, half_h)
    ]

    world_corners = []
    for x_local, y_local in local_corners:
        x_rot, y_rot = rotate_point(x = x_local, y = y_local, angle_deg = angle_deg)
        x_world = cx + x_rot
        y_world = cy + y_rot

        world_corners.append((x_world, y_world))
    
    return world_corners