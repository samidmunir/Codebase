#include <stdio.h>

int main(void) {
    int user_fav_number = 0;

    printf("\nEnter your favorite number: ");
    scanf("%d", &user_fav_number);

    printf("--> user_fav_number: %d\n", user_fav_number);

    return 0;
}