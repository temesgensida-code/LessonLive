from django.db import migrations, models


def assign_note_index_per_classroom(apps, schema_editor):
    ClassroomNote = apps.get_model('classroom', 'ClassroomNote')

    classroom_ids = (
        ClassroomNote.objects.order_by()
        .values_list('classroom_id', flat=True)
        .distinct()
    )

    for classroom_id in classroom_ids:
        notes = ClassroomNote.objects.filter(classroom_id=classroom_id).order_by('id')
        for index, note in enumerate(notes, start=1):
            ClassroomNote.objects.filter(pk=note.pk).update(note_index=index)


class Migration(migrations.Migration):

    dependencies = [
        ('classroom', '0002_classroomnote_displayedclassroomnote'),
    ]

    operations = [
        migrations.AddField(
            model_name='classroomnote',
            name='note_index',
            field=models.PositiveIntegerField(null=True),
        ),
        migrations.RunPython(assign_note_index_per_classroom, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='classroomnote',
            name='note_index',
            field=models.PositiveIntegerField(),
        ),
        migrations.AlterUniqueTogether(
            name='classroomnote',
            unique_together={('classroom', 'note_index')},
        ),
    ]
