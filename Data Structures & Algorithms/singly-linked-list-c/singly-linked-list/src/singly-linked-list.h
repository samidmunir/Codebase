struct singly_linked_list_node {
    int data;
    struct singly_linked_list_node *next;
};

struct singly_linked_list {
    struct singly_linked_list_node *head;
    int pointer;
    int number_of_elements;
};

struct singly_linked_list * initialize_singly_linked_list();

struct singly_linked_list * insert_head(struct singly_linked_list *linked_list, int data);

struct singly_linked_list * remove_head(struct singly_linked_list *linked_list);

struct singly_linked_list * insert_tail(struct singly_linked_list *linked_list, int data);

struct singly_linked_list * remove_tail(struct singly_linked_list *linked_list);